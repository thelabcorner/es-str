/***************************************************************************
 * ESSTRTrim — ExternalObject accelerator for ESSTR trim methods.
 *
 * Direct-interface ABI: pinned ESABI v0.3.0 via ESABI_DIRECT_FUNCTION(name)
 * Returned strings are UTF-8, allocated with HeapAlloc and released by
 * ESFreeMem. Negative error codes are never returned.
 *
 * Methods:
 *   trim_s         -> string (modern trim semantics)
 *   trimLeft_s     -> string
 *   trimRight_s    -> string
 *   ping_d         -> 42
 *   version_s      -> banner
 ***************************************************************************/

#include <stddef.h>
#include <esabi/esabi.h>

#define WINAPI __stdcall

typedef void* HANDLE;
typedef int BOOL;
typedef unsigned long DWORD;
typedef unsigned long SIZE_T;

__declspec(dllimport) HANDLE WINAPI GetProcessHeap(void);
__declspec(dllimport) void* WINAPI HeapAlloc(HANDLE hHeap, DWORD dwFlags, SIZE_T dwBytes);
__declspec(dllimport) BOOL WINAPI HeapFree(HANDLE hHeap, DWORD dwFlags, void* lpMem);

static size_t esstr_strlen(const char* s)
{
    const char* p = s;
    if (!s) return 0;
    while (*p) p++;
    return (size_t)(p - s);
}

static void esstr_memcpy(char* dst, const char* src, size_t n)
{
    while (n--) *dst++ = *src++;
}

static char* esstr_dup_range(const char* s, size_t start, size_t end)
{
    size_t n = end > start ? end - start : 0;
    char* out = (char*)HeapAlloc(GetProcessHeap(), 0, (SIZE_T)(n + 1));
    if (!out) return (char*)0;
    if (n) esstr_memcpy(out, s + start, n);
    out[n] = '\0';
    return out;
}

static int bytes_at(const unsigned char* s, size_t len, size_t pos,
                    unsigned char a, unsigned char b, unsigned char c)
{
    return pos + 3 <= len && s[pos] == a && s[pos + 1] == b && s[pos + 2] == c;
}

static size_t leading_ws_len(const unsigned char* s, size_t len, size_t pos)
{
    unsigned char c;
    if (pos >= len) return 0;
    c = s[pos];
    if (c == 0x20 || c == 0x09 || c == 0x0A || c == 0x0D || c == 0x0B || c == 0x0C) return 1;
    if (c == 0xC2 && pos + 1 < len && s[pos + 1] == 0xA0) return 2; /* NBSP */
    if (bytes_at(s, len, pos, 0xE1, 0x9A, 0x80)) return 3; /* U+1680 */
    if (c == 0xE2 && pos + 2 < len) {
        if (s[pos + 1] == 0x80) {
            c = s[pos + 2];
            if ((c >= 0x80 && c <= 0x8A) || c == 0xA8 || c == 0xA9 || c == 0xAF) return 3;
        }
        if (s[pos + 1] == 0x81 && s[pos + 2] == 0x9F) return 3; /* U+205F */
    }
    if (bytes_at(s, len, pos, 0xE3, 0x80, 0x80)) return 3; /* U+3000 */
    if (bytes_at(s, len, pos, 0xEF, 0xBB, 0xBF)) return 3; /* U+FEFF */
    return 0;
}

static size_t trailing_ws_len(const unsigned char* s, size_t start, size_t end)
{
    unsigned char c;
    if (end <= start) return 0;
    c = s[end - 1];
    if (c == 0x20 || c == 0x09 || c == 0x0A || c == 0x0D || c == 0x0B || c == 0x0C) return 1;
    if (end >= start + 2 && s[end - 2] == 0xC2 && s[end - 1] == 0xA0) return 2;
    if (end >= start + 3) {
        size_t p = end - 3;
        if (s[p] == 0xE1 && s[p + 1] == 0x9A && s[p + 2] == 0x80) return 3;
        if (s[p] == 0xE2 && s[p + 1] == 0x80) {
            c = s[p + 2];
            if ((c >= 0x80 && c <= 0x8A) || c == 0xA8 || c == 0xA9 || c == 0xAF) return 3;
        }
        if (s[p] == 0xE2 && s[p + 1] == 0x81 && s[p + 2] == 0x9F) return 3;
        if (s[p] == 0xE3 && s[p + 1] == 0x80 && s[p + 2] == 0x80) return 3;
        if (s[p] == 0xEF && s[p + 1] == 0xBB && s[p + 2] == 0xBF) return 3;
    }
    return 0;
}

static esabi_error trim_impl(esabi_value* argv, esabi_long argc, esabi_value* retval, int mode)
{
    const char* in;
    const unsigned char* u;
    size_t len, st, en, n;
    if (argc < 1 || argv[0].type != ESABI_TYPE_STRING || !argv[0].payload.string_value) return ESABI_ERR_BAD_ARGUMENTS;
    in = argv[0].payload.string_value;
    u = (const unsigned char*)in;
    len = esstr_strlen(in);
    st = 0;
    en = len;
    if (mode != 2) {
        while ((n = leading_ws_len(u, len, st)) != 0) st += n;
    }
    if (mode != 1) {
        while ((n = trailing_ws_len(u, st, en)) != 0) en -= n;
    }
    {
        char* out = esstr_dup_range(in, st, en);
        if (!out) return 10003;
        esabi_value_set_string(retval, out);
    }
    return ESABI_OK;
}

ESABI_DIRECT_FUNCTION(trim) { return trim_impl(argv, argc, retval, 0); }
ESABI_DIRECT_FUNCTION(trimLeft) { return trim_impl(argv, argc, retval, 1); }
ESABI_DIRECT_FUNCTION(trimRight) { return trim_impl(argv, argc, retval, 2); }

ESABI_DIRECT_FUNCTION(ping)
{
    (void)argv; (void)argc;
    esabi_value_set_i32(retval, 42);
    return ESABI_OK;
}

ESABI_DIRECT_FUNCTION(version)
{
    (void)argv; (void)argc;
    {
        char* out = esstr_dup_range("ESSTRTrim/1", 0, 11);
        if (!out) return 10003;
        esabi_value_set_string(retval, out);
    }
    return ESABI_OK;
}

ESABI_INITIALIZE_FUNCTION
{
    (void)argv; (void)argc;
    return "trim_s,trimLeft_s,trimRight_s,ping_d,version_s";
}

ESABI_VERSION_FUNCTION { return 1; }
ESABI_FREE_FUNCTION { if (pointer) HeapFree(GetProcessHeap(), 0, pointer); }
ESABI_TERMINATE_FUNCTION { }

BOOL WINAPI DllMain(void* hinst, unsigned long reason, void* reserved)
{
    (void)hinst; (void)reason; (void)reserved;
    return 1;
}
