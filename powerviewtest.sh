#!/bin/bash

# To execute this script you may need to modify its permissions.
#   Run: chmod +x powerviewtest.sh


if test -z "$1"; then
    echo ""
    echo "Command Line Parameters: powerviewtest [IPAddress] [ShadeID] [posKind1] [position1]"
    echo "   [IPAddress]     - the ip address of the hub"
    echo "   [ShadeID]       - the ID of the shade"
    echo "   [posKind1]      - the posKind1 value"
    echo "                   - Examples: 1 => shade up/down"
    echo "                               2 => ?"
    echo "                               3 => tilt vertical/horizontal?"
    echo "                               4 => tilt vertical/horizontal?"
    echo "   [position1]     - number value representing how much to move the shade based on posKind1"
    echo "                   - Examples: If type is 1 range is = 0-65535"
    echo "                               Type 3 and 4 should be 0-32767"
    echo ""
else
    echo $'\n' >> powerviewtest.log

    echo curl -X PUT -H "Content-Type: application/json" -d "{\"shade\":{\"id\":$2,\"positions\":{\"posKind1\":$3,\"position1\":$4}}}" "http://$1/api/shades/$2" >> powerviewtest.log
    curl -X PUT -H "Content-Type: application/json" -d "{\"shade\":{\"id\":$2,\"positions\":{\"posKind1\":$3,\"position1\":$4}}}" "http://$1/api/shades/$2" >> powerviewtest.log

    echo $'\n' >> powerviewtest.log
fi
