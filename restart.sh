#!/bin/bash
#
# Script to kill and restart irc-hybrid-client
#
# This script is intended to restart the NodeJs web server after
# changes to the configuration files: credentials.json
#
# If the irc-hybrid-client is not currently running, the irc-hybrid-client
# will be started. Any error message from the kill command may be ignored.
#
# Assumptions:
#   - Script runs in bash and uses "/usr/bin/jq" utility to parse JSON
#   - User starts script from base folder of repository, example: ./restart.sh
#   - Credentials.json contains full PID file path name, example: "pidFilename": "/home/user1/tmp/ircHybridClient.PID",
#   - This is a user run untility and not intended for use with cron
#

# Check this is run from the proper folder
if ! [ -f bin/www ] ; then
  echo "The irc-hybrid-client executable not found. This script should be run from the base folder of the repository"
  exit 1
fi

# Credentials file is found
if ! [ -f credentials.json ] ; then
  echo "File credentials.json not found."
  exit 1
fi

# Check that JSON parser is installed in the OS
if ! [ -f /usr/bin/jq ] ; then
  echo "JSON parser jq not found. The package may not be installed. In Debian/Ubuntu: apt-get install jq"
  exit 1
fi

# Get PID filename
PIDFILE=$(cat credentials.json | jq -r ".pidFilename")
if [ -z "$PIDFILE" ] ; then
  echo "Configuration variable \"pidFilename\" not set in credentials.json"
  exit 1
fi
if [ "$PIDFILE" == "null" ] ; then
  echo "Configuration variable \"pidFilename\" not found in credentials.json"
  exit 1
fi

# Read the PID file and get PID number
KILLPID=$(cat $PIDFILE)
if [ -z "$KILLPID" ] ; then
  echo "PID number not found in PID file $PIDFILE"
fi

# All prerequisites met, go ahead and kill the previous process
if [ -n "$KILLPID" ] ; then
  echo "Killing process $KILLPID node bin/www (irc-hybrid-client-004)"
  kill -SIGTERM  $KILLPID
fi

# wait for it to exit
sleep 2

# Launch new instance of irc-hybrid-client
export NODE_ENV="production"
node --expose-gc bin/www &>> logs/node.log &

sleep 2

# Show results by tail log file
tail -20 logs/node.log
