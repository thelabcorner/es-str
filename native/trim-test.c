/***************************************************************************
 * ESSTRTrim local ABI self-test.
 *
 * No Illustrator required: LoadLibrary/GetProcAddress drives the built DLL
 * through the same pinned ESABI v0.3.0 contract that ExternalObject uses. Exits 0 on pass;
 * otherwise exits with a small nonzero code identifying the failed vector.
 ***************************************************************************/

#include <esabi/esabi.h>

#define WINAPI __stdcall

typedef void* HMODULE;
typedef int BOOL;
typedef unsigned long DWORD;

__declspec(dllimport) HMODULE WINAPI LoadLibraryA(const char* lpLibFileName);
__declspec(dllimport) void* WINAPI GetProcAddress(HMODULE hModule, const char* lpProcName);
__declspec(dllimport) BOOL WINAPI FreeLibrary(HMODULE hLibModule);
__declspec(dllimport) void WINAPI ExitProcess(unsigned int uExitCode);

typedef esabi_error (ESABI_CALL *EsFn)(esabi_value* argv, esabi_long argc, esabi_value* retval);
typedef void (ESABI_CALL *EsFreeMemFn)(void* p);

__attribute__((used)) unsigned int _fltused = 0;

static unsigned long c_strlen(const char* s)
{
    const char* p = s;
    while (*p) p++;
    return (unsigned long)(p - s);
}

static int c_streq(const char* a, const char* b)
{
    while (*a && *a == *b) { a++; b++; }
    return *a == *b;
}

static int call_string(EsFn fn, EsFreeMemFn free_mem, const char* in, const char* expect)
{
    esabi_value argv[1];
    esabi_value ret;
    long err;
    esabi_value_set_string(&argv[0], (char*)in);
    esabi_value_set_undefined(&ret);
    err = fn(argv, 1, &ret);
    if (err != ESABI_OK) return 0;
    if (ret.type != ESABI_TYPE_STRING || !ret.payload.string_value) return 0;
    if (!c_streq(ret.payload.string_value, expect)) {
        free_mem(ret.payload.string_value);
        return 0;
    }
    free_mem(ret.payload.string_value);
    return 1;
}

static int bad_arg_returns_type_error(EsFn fn)
{
    esabi_value ret;
    esabi_value_set_undefined(&ret);
    return fn((esabi_value*)0, 0, &ret) == ESABI_ERR_BAD_ARGUMENTS;
}

void mainCRTStartup(void)
{
    HMODULE dll;
    EsFn trim;
    EsFn trimLeft;
    EsFn trimRight;
    EsFn ping;
    EsFn version;
    EsFreeMemFn free_mem;
    esabi_value argv[1];
    esabi_value ret;

    (void)c_strlen;
    dll = LoadLibraryA("native\\bin\\ESSTRTrim.dll");
    if (!dll) dll = LoadLibraryA("ESSTRTrim.dll");
    if (!dll) ExitProcess(10);

    trim = (EsFn)GetProcAddress(dll, "trim");
    trimLeft = (EsFn)GetProcAddress(dll, "trimLeft");
    trimRight = (EsFn)GetProcAddress(dll, "trimRight");
    ping = (EsFn)GetProcAddress(dll, "ping");
    version = (EsFn)GetProcAddress(dll, "version");
    free_mem = (EsFreeMemFn)GetProcAddress(dll, "ESFreeMem");
    if (!trim || !trimLeft || !trimRight || !ping || !version || !free_mem) ExitProcess(11);

    esabi_value_set_double(&argv[0], 0.0);
    esabi_value_set_undefined(&ret);
    if (ping(argv, 1, &ret) != ESABI_OK || ret.type != ESABI_TYPE_INTEGER || ret.payload.signed_value != 42) ExitProcess(12);

    if (!call_string(version, free_mem, "", "ESSTRTrim/1")) ExitProcess(13);
    if (!call_string(trim, free_mem, " \t\r\nabc\xEF\xBB\xBF", "abc")) ExitProcess(14);
    if (!call_string(trim, free_mem, "\xE1\x9A\x80" "abc" "\xE3\x80\x80", "abc")) ExitProcess(15);
    if (!call_string(trim, free_mem, "\xE1\xA0\x8E" "abc" "\xE1\xA0\x8E", "\xE1\xA0\x8E" "abc" "\xE1\xA0\x8E")) ExitProcess(16); /* U+180E kept */
    if (!call_string(trimLeft, free_mem, "\xE3\x80\x80" "abc", "abc")) ExitProcess(17);
    if (!call_string(trimRight, free_mem, "abc" "\xE2\x80\xA9", "abc")) ExitProcess(18);
    if (!call_string(trim, free_mem, "abc", "abc")) ExitProcess(19);
    if (!call_string(trim, free_mem, "\t\r\n", "")) ExitProcess(20);
    if (!bad_arg_returns_type_error(trim)) ExitProcess(21);

    FreeLibrary(dll);
    ExitProcess(0);
}
