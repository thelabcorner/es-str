# Build ESSTRTrim.dll (ExternalObject accelerator for ESPACK).
# Usage: powershell -ExecutionPolicy Bypass -File native/build.ps1 [-Name ESSTRTrim2.dll]

param(
    [string]$Name = "ESSTRTrim.dll"
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$esabiInclude = Join-Path $here "..\deps\esabi\include"
if (-not (Test-Path (Join-Path $esabiInclude "esabi\esabi.h"))) {
    throw "ESABI dependency missing. Run: git submodule update --init --recursive"
}

function Find-VsDevCmd {
    $candidates = @(
        "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat",
        "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat",
        "C:\Program Files\Microsoft Visual Studio\2019\BuildTools\Common7\Tools\VsDevCmd.bat",
        "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\Common7\Tools\VsDevCmd.bat"
    )
    foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
    throw "VsDevCmd.bat not found - install Desktop development with C++ Build Tools"
}

$devcmd = Find-VsDevCmd
$envBlock = cmd /c "`"$devcmd`" -arch=x64 -host_arch=x64 >nul 2>&1 && set"
$envBlock | ForEach-Object {
    if ($_ -match "^(.*?)=(.*)$") {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

$outDir = Join-Path $here "bin"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = Join-Path $here "esstr_string.c"
$obj = Join-Path $here "esstr_string.obj"
$out = Join-Path $outDir $Name
$testSrc = Join-Path $here "trim-test.c"
$testObj = Join-Path $here "trim-test.obj"
$testOut = Join-Path $outDir "ESSTRTrimTest.exe"

$clang = $env:CLANG_PATH
$lld = $env:LLD_PATH
if (-not $clang -or -not $lld) {
    $emsdk = "C:\dev\emsdk\upstream\bin"
    if (-not $clang -and (Test-Path (Join-Path $emsdk "clang.exe"))) { $clang = Join-Path $emsdk "clang.exe" }
    if (-not $lld -and (Test-Path (Join-Path $emsdk "lld.exe"))) { $lld = Join-Path $emsdk "lld.exe" }
}

$libPaths = @()
foreach ($lp in ($env:LIB -split ';')) { if ($lp.Trim()) { $libPaths += "/libpath:$($lp.Trim())" } }
$incPaths = @()
foreach ($ip in ($env:INCLUDE -split ';')) { if ($ip.Trim()) { $incPaths += "-I$($ip.Trim().Replace('\\', '\'))" } }

if ($clang -and $lld -and (Test-Path $clang) -and (Test-Path $lld)) {
    Write-Output "ESSTRTrim build: clang+lld (freestanding, x86-64-v2, deterministic)"
    & $clang --target=x86_64-pc-windows-msvc -O3 -ffast-math -ffreestanding `
        -fno-stack-protector -mno-stack-arg-probe -fno-builtin `
        -march=x86-64-v2 -mtune=generic -flto "-I$esabiInclude" @incPaths -c "$src" -o "$obj"
    if ($LASTEXITCODE -ne 0) { throw "clang failed with exit $LASTEXITCODE" }
    & $lld -flavor link /dll /entry:DllMain /subsystem:windows /nodefaultlib `
        /machine:x64 /timestamp:0 /out:"$out" "$obj" @libPaths kernel32.lib
    if ($LASTEXITCODE -ne 0) { throw "lld failed with exit $LASTEXITCODE" }
    & $clang --target=x86_64-pc-windows-msvc -O2 -ffreestanding `
        -fno-stack-protector -mno-stack-arg-probe -fno-builtin `
        -march=x86-64-v2 -mtune=generic "-I$esabiInclude" @incPaths -c "$testSrc" -o "$testObj"
    if ($LASTEXITCODE -ne 0) { throw "clang test failed with exit $LASTEXITCODE" }
    & $lld -flavor link /entry:mainCRTStartup /subsystem:console /nodefaultlib `
        /machine:x64 /timestamp:0 /out:"$testOut" "$testObj" @libPaths kernel32.lib
    if ($LASTEXITCODE -ne 0) { throw "lld test failed with exit $LASTEXITCODE" }
} elseif (Get-Command cl -ErrorAction SilentlyContinue) {
    Write-Output "ESSTRTrim build: MSVC fallback (freestanding, /nodefaultlib)"
    & cl /nologo /O2 /GS- /I"$esabiInclude" /c "$src" /Fo:"$obj"
    if ($LASTEXITCODE -ne 0) { throw "cl failed with exit $LASTEXITCODE" }
    & link /dll /nodefaultlib /entry:DllMain /subsystem:windows /machine:x64 `
        /Brepro /out:"$out" "$obj" @libPaths kernel32.lib
    if ($LASTEXITCODE -ne 0) { throw "link failed with exit $LASTEXITCODE" }
    & cl /nologo /O2 /GS- /I"$esabiInclude" /c "$testSrc" /Fo:"$testObj"
    if ($LASTEXITCODE -ne 0) { throw "cl test failed with exit $LASTEXITCODE" }
    & link /nodefaultlib /entry:mainCRTStartup /subsystem:console /machine:x64 `
        /Brepro /out:"$testOut" "$testObj" @libPaths kernel32.lib
    if ($LASTEXITCODE -ne 0) { throw "link test failed with exit $LASTEXITCODE" }
} else {
    throw "No toolchain: set CLANG_PATH/LLD_PATH or install Build Tools with MSVC"
}

$size = (Get-Item $out).Length
Write-Output "Built: $out ($size bytes)"
$testSize = (Get-Item $testOut).Length
Write-Output "Built: $testOut ($testSize bytes)"
try { & dumpbin /exports $out | Select-Object -First 24 } catch { }
Remove-Item -LiteralPath $obj -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $testObj -Force -ErrorAction SilentlyContinue
