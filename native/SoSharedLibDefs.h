/**************************************************************************
* Minimal Adobe ExtendScript ExternalObject ABI definitions used by ESSTR.
* Derived from Adobe's SoSharedLibDefs.h direct-interface contract.
**************************************************************************/
#ifndef ESSTR_SO_SHARED_LIB_DEFS_H
#define ESSTR_SO_SHARED_LIB_DEFS_H

#define kESErrOK 0
#define kESErrBadArgumentList 20

struct TaggedData_s {
  union {
    long intval;
    double fltval;
    char* string;
    long* hObject;
  } data;
  long type;
  long filler;
};
typedef struct TaggedData_s TaggedData;

#define kTypeUndefined 0
#define kTypeBool 2
#define kTypeDouble 3
#define kTypeString 4
#define kTypeInteger 123
#define kTypeUInteger 124

#endif
