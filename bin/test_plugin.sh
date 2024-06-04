set -e
set -o pipefail

cd $TRAVIS_BUILD_DIR/ecr
mvn test -U -Dmaven.javadoc.skip=true -T 4 -B -V