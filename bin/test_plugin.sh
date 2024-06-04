set -e
set -o pipefail

cd $TRAVIS_BUILD_DIR/ecr
mvn test -U -Dmaven.javadoc.skip=true -Ddebug=false -e -T 4 -B -V