
#!/bin/bash

if ! command -v ab &> /dev/null
then
     echo "ab could not be found. Please install ab (apache benchmark) tool in order to run this test"
    exit 1
fi


PORT=8080
WORKERS=4
echo Starting server ... 
node src/passthru.js $PORT $WORKERS &

echo Generating 10MB payload data ...
head -c 10M </dev/urandom > test.data

echo Starting test ...
ab -p test.data -n 1000 -c $WORKERS http://localhost:$PORT/

echo Cleaning up test data ...
rm test.data

echo Killing server ...
kill %%
