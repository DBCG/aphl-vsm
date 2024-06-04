set -e
set -o pipefail

cd $TRAVIS_BUILD_DIR/ecr
export MAVEN_OPTS="-Ddebug=false -Dorg.slf4j.simpleLogger.defaultLogLevel=error"
echo $MAVEN_OPTS
mvn test -U -Dmaven.javadoc.skip=true -T 4 -B -V