#!/bin/bash
#
# Script to kill and restart irc-hybrid-client
#
# Usage:  ./restart2.sh
#
# This script is intended to restart the NodeJs web server after
# changes to the environment variable configuration or after
# changes to the .env file.
#
# The restart2.sh script assumes you are using environment variables
# to configure the irc-hybrid-client. If you are using 
# the alternate configuration stored in the \credentials.json" file,
# you should use the "restart.sh" script instead.
#
# If the irc-hybrid-client is not currently running, the irc-hybrid-client
# will be started. Any error message from the kill command may be ignored.
#
# Assumptions:
#   - User starts script from base folder of repository, example: ./restart2.sh
#   - The environment variable SERVER_PID_FILE contains the full path the irc-hybrid-client PID file.
#   - This is a user run untility and not intended for use with cron
#
# Optional:
#   - The environment variable SERVER_INSTANCE_NUMBER contains an 
#     integer 0 to 65535 to identify the server. Adding the number to the 
#     command line will identify a specific server in the ps process list.

# Check this is run from the proper folder
if ! [ -f bin/www.mjs ] ; then
  echo "The irc-hybrid-client executable not found. This script should be run from the base folder of the repository"
  exit 1
fi

# Check if optional instance number is set as an enviornment variable
# If not found, set to empty string
if [ -z "$SERVER_INSTANCE_NUMBER" ] ; then
  SERVER_INSTANCE_NUMBER=""
fi

# Server PID filename should be in environment variable SERVER_PID_FILENAME
 if [ -z "$SERVER_PID_FILENAME" ] ; then
  echo "Error: Environment variable \"SERVER_PID_FILENAME\" not set."
  echo
  echo "This restart script expects SERVER_PID_FILENAME environment"
  echo "variable to contain a full pathname to the irc-hybrid-client PID file."
  echo "Example command line:"
  echo "SERVER_PID_FILENAME=/home/user/tmp/ircHybridClient.PID ./restart2.sh"
  exit 1
fi

# Read the PID file and get PID number
KILLPID=$(cat $SERVER_PID_FILENAME)
if [ -z "$KILLPID" ] ; then
  echo "PID number not found in PID file $SERVER_PID_FILENAME"
  exit 1
fi

# All prerequisites met, go ahead and kill the previous process
if [ -n "$KILLPID" ] ; then
  echo "Killing process $KILLPID node bin/www.mjs $SERVER_INSTANCE_NUMBER"
  kill -SIGTERM  $KILLPID
fi

# wait for it to exit
sleep 2

# Launch new instance of irc-hybrid-client
#
#   '--expose-gc' (Optional) - Used to monitor memory usage (Server, More, button [Test-1])
#
#   '$SERVER_INSTANCE_NUMBER' (Optional) - Numeric identifier used when multiple 
#        instances are run on the same server. The irc-hybrid-client 
#        does not accept any command line arguments so the instance number is igonred.
#        This may be useful in the 'ps' command to identify proper instance.
#
#   '&>> logs/node.log' (Optional) - In the event that NodeJs prints errors to 
#        stdout or errout, they would be capture in this file.
#        In normal use, only the program start notices should be present
#
export NODE_ENV="production"
/usr/bin/node --expose-gc bin/www.mjs $SERVER_INSTANCE_NUMBER &>> logs/node.log &

sleep 2

# Show results by tail log file

if [ -f logs/node.log ] ; then
  tail -20 logs/node.log
fi
