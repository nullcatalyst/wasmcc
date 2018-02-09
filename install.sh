#!/usr/bin/env bash

###############################
#      Install LLVM(WASM)     #
###############################

# NOTE: THIS WILL TAKE A WHILE... :(

# locations, e.g.
WORKDIR=llvm
mkdir -p $WORKDIR
INSTALLDIR=$WORKDIR
cd $WORKDIR

# checkout LLVM
svn co http://llvm.org/svn/llvm-project/llvm/trunk llvm

cd $WORKDIR/llvm/tools

# checkout clang
svn co http://llvm.org/svn/llvm-project/cfe/trunk clang

# checkout lld
svn co http://llvm.org/svn/llvm-project/lld/trunk lld

# build folder (~14 min; ~1 hour /wo -j)
mkdir -p $WORKDIR/llvm-build
cd $WORKDIR/llvm-build
# For Debug build:
cmake -G "Unix Makefiles" -DCMAKE_INSTALL_PREFIX=$INSTALLDIR -DLLVM_TARGETS_TO_BUILD="" -DLLVM_EXPERIMENTAL_TARGETS_TO_BUILD=WebAssembly -DCMAKE_BUILD_TYPE=Release -DLLVM_INCLUDE_EXAMPLES=OFF $WORKDIR/llvm
make -j 8

# install llvm
make install
exit 0

###############################


###############################
#      Install binaryen       #
###############################

#brew install binaryen
cd ~
git clone https://github.com/WebAssembly/binaryen.git
cd binaryen
cmake . && make -j 8

###############################
