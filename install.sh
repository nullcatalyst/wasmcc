#!/usr/bin/env bash

BASEDIR=$PWD

###############################
#      Install LLVM(WASM)     #
###############################

# NOTE: THIS WILL TAKE A WHILE... :(

# locations, e.g.
LLVMDIR=$BASEDIR/llvm
mkdir -p $LLVMDIR

cd $LLVMDIR
git clone https://github.com/llvm-mirror/llvm.git # checkout LLVM

cd $LLVMDIR/llvm/tools
git clone https://github.com/llvm-mirror/clang.git # checkout clang
git clone https://github.com/llvm-mirror/lld.git # checkout lld

# build folder (~14 min; ~1 hour /wo -j)
mkdir -p $LLVMDIR/build
cd $LLVMDIR/build

cmake -G "Unix Makefiles" -DCMAKE_INSTALL_PREFIX=$LLVMDIR -DLLVM_TARGETS_TO_BUILD="" -DLLVM_EXPERIMENTAL_TARGETS_TO_BUILD=WebAssembly -DCMAKE_BUILD_TYPE=Release -DLLVM_INCLUDE_EXAMPLES=OFF $LLVMDIR/llvm && make -j 8

# install llvm
make install

###############################


###############################
#      Install binaryen       #
###############################

cd $BASEDIR
git clone https://github.com/WebAssembly/binaryen.git
cd $BASEDIR/binaryen
cmake . && make -j 8

###############################
