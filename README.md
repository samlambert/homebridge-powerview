# homebridge-powerview

This is a plugin for [Homebridge](https://github.com/nfarina/homebridge).  It allows you to control your [Hunter Douglas PowerView](http://promos.hunterdouglas.ca/powerview-en/) roller blinds server using Siri and the Home app.

**NOTE:** I only have the Gen 1 Powerview hub with the roller shades to test with.  I can't guarantee this will work with any other shades and it is very difficult to update the code to work with hardware I do not have. I am open to anybody willing to contribute code.


# Installation

1.  Install [Homebridge](https://github.com/nfarina/homebridge) (if not already installed).
2.  Install this plugin copying it to the node_modules folder (manual step until I get it setup in npm).
	Alternatively run the following command:  npm install -g GvnCampbell/homebridge-powerview
3.  Update your confiugration file.  See below for a sample.



# Configuration

```
"platforms":
    [
       	{
        "platform": "PowerView",
        "ip_address": "WWW.XXX.YYY.ZZZ",
        "debug": false,
        "fullmotiontime" : 30000,
        "fullmotiontimepadding" : 2000,
        "defaultcurrentposition" : 50,
        "querytimeout": 10000,
        "queryattempts": 10
        }
    ]
```


| Parameter                  | Note                                                                                                                                                                                         |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `platform`                 | required, must be set to "PowerView"                                                                                                                                                         |
| `ip_address`               | required, the ip address of the PowerView hub                                                                                                                                                |
| `debug`                    | optional, default is 'false', if set to true will add extra logging in the output                                                                                                            |
| `fullmotiontime`           | optional, default is 30000, an estimate as to the length of time it takes to fully open/close the blinds in milliseconds                                                                     |
| `fullmotiontimepadding`    | optional, default is 2000, an estimate to the amount of time it takes the blinds to react in milliseconds                                                                                    |
| `defaultcurrentposition`   | optional, default is 50, sometimes the hub doesn't know where the blinds are, in this case we will set it to a default setting                                                               |
| `querytimeout`             | optional, default is 10000, amount of time to wait when querying the hub as it sometimes does not like to respond                                                                            |
| `queryattempts`            | optional, default is 10, number of times to try sending a command, will quit when successful or if this number is reached                                                                    |
