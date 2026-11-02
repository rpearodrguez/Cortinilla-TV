// Ayudante de Cortinilla TV: captura el audio SOLO de un programa (y sus procesos hijos)
// con la API "process loopback" de Windows 10 (build 20348+) / Windows 11, la misma idea que
// usan OBS ("Application Audio Capture") y Discord.
//
//   ProcessLoopback.exe pid-of-hwnd <hwnd>   -> imprime el PID dueño de la ventana
//   ProcessLoopback.exe capture <pid>        -> emite PCM 48000 Hz, estéreo, 16 bits, little-endian por stdout
//
// Se compila con el csc.exe que trae Windows (C# 5): ver compile.js. No usa paquetes de terceros.
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

static class Program
{
    const int SampleRate = 48000, Channels = 2, BitsPerSample = 16;
    const int BlockAlign = Channels * BitsPerSample / 8;

    // ---------- interfaces COM ----------
    [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioClient
    {
        [PreserveSig] int Initialize(int shareMode, uint streamFlags, long hnsBufferDuration, long hnsPeriodicity, IntPtr format, IntPtr audioSessionGuid);
        [PreserveSig] int GetBufferSize(out uint bufferFrames);
        [PreserveSig] int GetStreamLatency(out long latency);
        [PreserveSig] int GetCurrentPadding(out uint padding);
        [PreserveSig] int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closestMatch);
        [PreserveSig] int GetMixFormat(out IntPtr deviceFormat);
        [PreserveSig] int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
        [PreserveSig] int Start();
        [PreserveSig] int Stop();
        [PreserveSig] int Reset();
        [PreserveSig] int SetEventHandle(IntPtr eventHandle);
        [PreserveSig] int GetService(ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }

    [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAudioCaptureClient
    {
        [PreserveSig] int GetBuffer(out IntPtr data, out uint numFrames, out uint flags, out ulong devicePosition, out ulong qpcPosition);
        [PreserveSig] int ReleaseBuffer(uint numFramesRead);
        [PreserveSig] int GetNextPacketSize(out uint numFramesInNextPacket);
    }

    [ComImport, Guid("72A22D78-CDE4-431D-B8CC-843A71199B6D"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IActivateAudioInterfaceAsyncOperation
    {
        [PreserveSig] int GetActivateResult(out int activateResult, [MarshalAs(UnmanagedType.IUnknown)] out object activatedInterface);
    }

    [ComImport, Guid("41D949AB-9862-444A-80F6-C261334DA5EB"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IActivateAudioInterfaceCompletionHandler
    {
        [PreserveSig] int ActivateCompleted(IActivateAudioInterfaceAsyncOperation activateOperation);
    }

    // marcador: el manejador puede llamarse desde cualquier hilo
    [ComImport, Guid("94EA2B94-E9CC-49E0-C0FF-EE64CA8F5B90"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IAgileObject { }

    class Handler : IActivateAudioInterfaceCompletionHandler, IAgileObject
    {
        public readonly ManualResetEvent Done = new ManualResetEvent(false);
        public int Result = -1;
        public object Interface;

        public int ActivateCompleted(IActivateAudioInterfaceAsyncOperation op)
        {
            int hr;
            object iface;
            op.GetActivateResult(out hr, out iface);
            Result = hr;
            Interface = iface;
            Done.Set();
            return 0;
        }
    }

    // ---------- API de Windows ----------
    [DllImport("Mmdevapi.dll", ExactSpelling = true, PreserveSig = false)]
    static extern void ActivateAudioInterfaceAsync(
        [MarshalAs(UnmanagedType.LPWStr)] string deviceInterfacePath, ref Guid riid, IntPtr activationParams,
        IActivateAudioInterfaceCompletionHandler completionHandler, out IActivateAudioInterfaceAsyncOperation operation);

    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("kernel32.dll")] static extern IntPtr CreateEvent(IntPtr attrs, bool manualReset, bool initialState, string name);
    [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    const uint AUDCLNT_STREAMFLAGS_LOOPBACK = 0x00020000;
    const uint AUDCLNT_STREAMFLAGS_EVENTCALLBACK = 0x00040000;
    const uint AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM = 0x80000000;
    const uint AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY = 0x08000000;
    const uint AUDCLNT_BUFFERFLAGS_SILENT = 0x2;

    [MTAThread]
    static int Main(string[] args)
    {
        try
        {
            if (args.Length == 2 && args[0] == "pid-of-hwnd")
            {
                uint pid;
                GetWindowThreadProcessId(new IntPtr(long.Parse(args[1])), out pid);
                if (pid == 0) { Console.Error.WriteLine("ventana no encontrada"); return 2; }
                Console.WriteLine(pid);
                return 0;
            }
            if (args.Length == 2 && args[0] == "capture")
                return Capture(uint.Parse(args[1]));
            Console.Error.WriteLine("uso: ProcessLoopback pid-of-hwnd <hwnd> | capture <pid>");
            return 1;
        }
        catch (Exception e)
        {
            Console.Error.WriteLine("error: " + e.Message);
            return 3;
        }
    }

    static IAudioClient ActivateProcessLoopback(uint pid)
    {
        // AUDIOCLIENT_ACTIVATION_PARAMS { type = PROCESS_LOOPBACK(1), pid, mode = INCLUDE_TARGET_PROCESS_TREE(0) }
        IntPtr blob = Marshal.AllocHGlobal(12);
        Marshal.WriteInt32(blob, 0, 1);
        Marshal.WriteInt32(blob, 4, unchecked((int)pid));
        Marshal.WriteInt32(blob, 8, 0);

        // PROPVARIANT (x64): vt = VT_BLOB (0x41), cbSize en el desplazamiento 8, puntero en el 16
        IntPtr pv = Marshal.AllocHGlobal(24);
        for (int i = 0; i < 24; i += 8) Marshal.WriteInt64(pv, i, 0);
        Marshal.WriteInt16(pv, 0, 0x41);
        Marshal.WriteInt32(pv, 8, 12);
        Marshal.WriteIntPtr(pv, 16, blob);

        Guid iidAudioClient = new Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2");
        Handler handler = new Handler();
        IActivateAudioInterfaceAsyncOperation op;
        ActivateAudioInterfaceAsync("VAD\\Process_Loopback", ref iidAudioClient, pv, handler, out op);
        if (!handler.Done.WaitOne(5000)) throw new Exception("tiempo agotado al activar la captura");
        if (handler.Result < 0) throw new Exception("no se pudo activar la captura (HRESULT 0x" + handler.Result.ToString("X8") + ")");
        return (IAudioClient)handler.Interface;
    }

    static int Capture(uint pid)
    {
        IAudioClient client = ActivateProcessLoopback(pid);

        // formato pedido: PCM 16 bits, estéreo, 48 kHz (la captura por proceso no tiene "mix format")
        IntPtr fmt = Marshal.AllocHGlobal(18);
        Marshal.WriteInt16(fmt, 0, 1);                              // WAVE_FORMAT_PCM
        Marshal.WriteInt16(fmt, 2, (short)Channels);
        Marshal.WriteInt32(fmt, 4, SampleRate);
        Marshal.WriteInt32(fmt, 8, SampleRate * BlockAlign);
        Marshal.WriteInt16(fmt, 12, (short)BlockAlign);
        Marshal.WriteInt16(fmt, 14, (short)BitsPerSample);
        Marshal.WriteInt16(fmt, 16, 0);

        uint flags = AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK
                   | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM | AUDCLNT_STREAMFLAGS_SRC_DEFAULT_QUALITY;
        int hr = client.Initialize(0, flags, 200000, 0, fmt, IntPtr.Zero); // 20 ms
        if (hr < 0) throw new Exception("Initialize falló (HRESULT 0x" + hr.ToString("X8") + ")");

        IntPtr evt = CreateEvent(IntPtr.Zero, false, false, null);
        hr = client.SetEventHandle(evt);
        if (hr < 0) throw new Exception("SetEventHandle falló (HRESULT 0x" + hr.ToString("X8") + ")");

        Guid iidCapture = new Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317");
        object svc;
        hr = client.GetService(ref iidCapture, out svc);
        if (hr < 0) throw new Exception("GetService falló (HRESULT 0x" + hr.ToString("X8") + ")");
        IAudioCaptureClient capture = (IAudioCaptureClient)svc;

        hr = client.Start();
        if (hr < 0) throw new Exception("Start falló (HRESULT 0x" + hr.ToString("X8") + ")");

        Stream stdout = Console.OpenStandardOutput();
        byte[] buf = new byte[0];
        Console.Error.WriteLine("listo");

        while (true)
        {
            WaitForSingleObject(evt, 200);
            uint packet;
            while (capture.GetNextPacketSize(out packet) >= 0 && packet > 0)
            {
                IntPtr data; uint frames, bflags; ulong dpos, qpc;
                if (capture.GetBuffer(out data, out frames, out bflags, out dpos, out qpc) < 0) break;
                int bytes = (int)frames * BlockAlign;
                if (buf.Length < bytes) buf = new byte[bytes];
                if ((bflags & AUDCLNT_BUFFERFLAGS_SILENT) != 0) Array.Clear(buf, 0, bytes);
                else Marshal.Copy(data, buf, 0, bytes);
                capture.ReleaseBuffer(frames);
                try { stdout.Write(buf, 0, bytes); stdout.Flush(); }
                catch (IOException) { return 0; } // Electron cerró la tubería: terminamos
            }
        }
    }
}
