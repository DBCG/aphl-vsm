set -e
set -o pipefail

cd $TRAVIS_BUILD_DIR/ecr
export MAVEN_OPTS="-Ddebug=false -Dorg.slf4j.simpleLogger.defaultLogLevel=error"
mvn test -U -Dmaven.javadoc.skip=true -T 4 -B -V