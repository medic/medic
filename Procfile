# Please define a .env file with relevant environment variables defined inside
# as key=value pairs (one per line.
#
# Possible variables include:
#
# COUCH_URL: url for accessing your couch db instance,
#   e.g. http://admin:pass@localhost:5984/medic
# COUCH_NODE_NAME: node name of couch on local host,
#   e.g. couchdb@localhost
#
# Alternatively, these values can be set as normal environment variables.

api: cd api && node server.js --allow-cors
webapp: grunt dev-no-npm
sentinel: cd sentinel && node server.js
