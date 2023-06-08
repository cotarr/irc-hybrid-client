#!/bin/bash
#
# Script to kill and restart irc-hybrid-client
#
# Usage:  ./restart.sh
#
# This script is intended to restart the NodeJs web server after
# changes to the configuration files: credentials.json
#
# The restart.sh script assumed you are using "credentials.json" file
# to configure the irc-hybrid-client. If you are using 
# the alternate environment variable configuration method,
# you should use the "restart2.sh" script instead.

# If the irc-hybrid-client is not currently running, the irc-hybrid-client
# will be started. Any error message from the kill command may be ignored.
#
# Assumptions:
#   - Script runs in bash and uses "/usr/bin/jq" utility to parse JSON
#   - User starts script from base folder of repository, example: ./restart.sh
#   - Credentials.json contains full PID file path name, example: "pidFilename": "/home/user1/tmp/ircHybridClient.PID",
#   - This is a user run untility and not intended for use with cron
#
# Optional:
#   - The property "instanceNumber" contains an integer 0 to 65535 to 
#     identify the server. Adding the number to the  command line will 
#     identify a specific server in the ps process list.

# Check this is run from the proper folder
if ! [ -f bin/www.mjs ] ; then
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

# Get Optional Instance Number 
INSTANCENO=$(cat credentials.json | jq -r ".instanceNumber")
if [ "$INSTANCENO" == "null" ] ; then
  INSTANCENO=""
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
  echo "Killing process $KILLPID node bin/www.mjs $INSTANCENO"
  kill -SIGTERM  $KILLPID
fi

# wait for it to exit
sleep 2

# Launch new instance of irc-hybrid-client
#
#   '--expose-gc' (Optional) - Used to monitor memory usage (Server, More, button [Test-1])
#
#   '$INSTANCENO' (Optional) - Numeric identifier used when multiple 
#        instances are run on the same server. The irc-hybrid-client 
#        does not accept any command line arguments so the instance number is igonred.
#        This may be useful in the 'ps' command to identify proper instance.
#
#   '&>> logs/node.log' (Optional) - In the event that NodeJs prints errors to 
#        stdout or errout, they would be capture in this file.
#        In normal use, only the program start notices should be present
#
export NODE_ENV="production"
/usr/bin/node --expose-gc bin/www.mjs $INSTANCENO &>> logs/node.log &

sleep 2

# Show results by tail log file

if [ -f logs/node.log ] ; then
  tail -20 logs/node.log
fi
