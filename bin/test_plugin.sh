set -e
set -o pipefail

cd $TRAVIS_BUILD_DIR/ecr
export MAVEN_SKIP_RC=true
mvn test -U -Dmaven.javadoc.skip=true -Ddebug=false -e -T 4 -B -V