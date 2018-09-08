"use strict";

var Service, Characteristic, UUIDGen;
var debug = false;
var exec = require('child_process').exec;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;
    homebridge.registerPlatform("homebridge-powerview", "PowerView", PowerViewPlatform);
}

function PowerViewPlatform(log, config) {
    this.log = log;
    debug = config["debug"];


    debugLog(this.log, "\x1b[32m%s\x1b[0m", "[PowerViewPlatform] Started.");

    this.ip_address = config["ip_address"];
    this.fullmotiontime = config["fullmotiontime"] || 30000;
    this.fullmotiontimepadding = config["fullmotiontimepadding"] || 2000;
    this.defaultcurrentposition = config["defaultcurrentposition"] || 50;
    this.querytimeout = config["querytimeout"] || 10000;
    this.queryattempts = config["queryattempts"] || 10;

    debugLog(this.log, "\x1b[32m%s\x1b[0m", "[PowerViewPlatform] Finished.");
}

function PowerViewAccessory(log, devicename, deviceid, devicepos, ip, platform) {
    this.log = log;

    debugLog(this.log, "\x1b[32m%s\x1b[0m", "[PowerViewAccessory] Started.");

    this.id = UUIDGen.generate(devicename);

    this.name = devicename;
    this.shadeid = deviceid;

    this.ip_address = ip;

    this.buffer = 0;

    this.currentPositionInitialized = false;
    this.targetPositionInitialized = false;
    this.targetPosition = 0;

    this.fullmotiontime = platform.fullmotiontime;
    this.fullmotiontimepadding = platform.fullmotiontimepadding;
    this.defaultcurrentposition = devicepos;
    this.querytimeout = platform.querytimeout;
    this.queryattempts = platform.queryattempts;

    debugLog(this.log, "\x1b[32m%s\x1b[0m", "[PowerViewAccessory] Finished.");
}

PowerViewPlatform.prototype = {
    accessories: function (callback) {
        debugLog(this.log, "\x1b[32m%s\x1b[0m", "[accessories] Started.");

        var that = this;

        let foundAccessories = [];

        var command = "curl \"" + "http://" + this.ip_address + "/api/shades?\"";
        var that = this;
        exec(command, function (error, stdout, stderr) {
            var cleanOut=stdout.trim();
            try {
                let parsedData = JSON.parse(cleanOut);
                if (parsedData.shadeData != null ) {
                    for (var sd of parsedData.shadeData) {
                        var shadename = Buffer.from(sd.name,'base64').toString();
                        var shadeid = sd.id;
                        var shadeposition = that.defaultcurrentposition;
                        if (sd.positions != null) {
                            shadeposition = posToPercent(sd.positions.position1);
                        };
                        var shadeaccessory = new PowerViewAccessory(that.log, shadename, shadeid, shadeposition, that.ip_address, that);
                        foundAccessories.push(shadeaccessory);
                    };
                };
            } catch (e) {
                debugLog(that.log, "\x1b[32m%s\x1b[0m", "[accessories] Error finding accessories: " + e);
            };
            debugLog(that.log, "\x1b[32m%s\x1b[0m", "[accessories] foundAccessories: " + foundAccessories.length);
            debugLog(that.log, "\x1b[32m%s\x1b[0m", "[accessories] Finished.");
            callback(foundAccessories);
        });
    }
};

PowerViewAccessory.prototype = {

    getServices: function() {
        debugLog(this.log, "\x1b[32m%s\x1b[0m","[getServices] Started.");
        var that = this;

        debugLog(this.log, "\x1b[32m%s\x1b[0m","[getServices] defaultcurrentposition: " + this.defaultcurrentposition);

        this.blindService = new Service.WindowCovering(this.name);

        this.blindService
            .setCharacteristic(Characteristic.CurrentPosition, this.defaultcurrentposition)
            .getCharacteristic(Characteristic.CurrentPosition)
            .on('get', this.getCurrentPosition.bind(this));

        this.blindService
            .setCharacteristic(Characteristic.TargetPosition, this.defaultcurrentposition)
            .getCharacteristic(Characteristic.TargetPosition)
            .on('set', that.setTargetPosition.bind(this))
            .on('get', that.getTargetPosition.bind(this));

        this.blindService
            .setCharacteristic(Characteristic.PositionState, Characteristic.PositionState.STOPPED)
            .getCharacteristic(Characteristic.PositionState)
            .on('get', this.getState.bind(this));

        var informationService = new Service.AccessoryInformation();
        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Hunter Douglas")
            .setCharacteristic(Characteristic.Model, "PowerView")
            .setCharacteristic(Characteristic.SerialNumber, this.name);


        debugLog(this.log, "\x1b[32m%s\x1b[0m","[getServices] Finished.");
        return [informationService, this.blindService];
    },

    getCurrentPosition: function(callback, ignore1, ignore2, countopt) {
        debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getCurrentPosition] Started.");
        debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getCurrentPosition] countopt: " + countopt);

        var count = countopt || 0;
        var command = "curl \"" + "http://" + this.ip_address + "/api/shades?" + this.shadeid + "\"";
        var that = this;

        exec(command, {timeout: this.querytimeout}, function (error, stdout, stderr) {
            var cleanOut=stdout.trim();
            debugLog(that.log, "\x1b[32m%s\x1b[0m", "(getCurrentPosition) cleanOut: " + cleanOut);
            var ret = that.defaultcurrentposition;
            try {
                let parsedData = JSON.parse(cleanOut);
                if (parsedData.shade != null ) {
                    if (parsedData.shade.positions != null) {
                        ret = parsedData.shade.positions.position1;
                        ret = posToPercent(ret);
                        that.currentPositionInitialized = true;
                        that.blindService
                            .setCharacteristic(Characteristic.CurrentPosition, ret)
                    };
                };
            } catch (e) {
                debugLog(that.log, "\x1b[32m%s\x1b[0m", "(getCurrentPosition) catch.e: " + e.toString());
                if (count >= that.queryattempts - 1) {
                    debugLog(that.log, "\x1b[32m%s\x1b[0m", "[getCurrentPosition] Communication error.  Giving up.");
                } else {
                    debugLog(that.log, "\x1b[32m%s\x1b[0m", "[getCurrentPosition] Communication error.  Will try again.  Count=" + count);
                    that.getCurrentPosition(function() {}, ignore1, ignore2, count + 1);
                };
            };
            debugLog(that.log, "\x1b[32m%s\x1b[0m", "[getCurrentPosition] ret: " + ret);
            debugLog(that.log, "\x1b[32m%s\x1b[0m", "[getCurrentPosition] Finished.");
            callback(null,ret);
        });
    },

    setTargetPosition: function(value, callback, ignore, ignore2, countopt) {
        debugLog(this.log, "\x1b[32m%s\x1b[0m","[setTargetPosition] Started.");
        debugLog(this.log, "\x1b[32m%s\x1b[0m","[setTargetPosition] value: " + value);
        debugLog(this.log, "\x1b[32m%s\x1b[0m","[setTargetPosition] countopt: " + countopt);

        var count = countopt || 0;

        var cp = this.blindService.getCharacteristic(Characteristic.CurrentPosition).value;
        var tp = value;

        var command = "curl -X PUT -H \"Content-Type: application/json\" -d \"{\\\"shade\\\":{\\\"id\\\":" + this.shadeid + ",\\\"positions\\\":{\\\"posKind1\\\":1,\\\"position1\\\":" + percentToPos(value) + "}}}\" \"http://" + this.ip_address + "/api/shades/" + this.shadeid + "\"";

        var that = this;
        that.buffer += 1;
        setTimeout(function () {
            that.buffer -= 1;
            if (that.buffer <= 0) {
                exec(command, {timeout: that.querytimeout}, function (error, stdout, stderr) {
                    var cleanOut=stdout.trim();
                    try {
                        debugLog(that.log, "\x1b[32m%s\x1b[0m", "[setTargetPosition] cleanOut: " + cleanOut);
                        let parsedData = JSON.parse(cleanOut);
                        debugLog(that.log, "\x1b[32m%s\x1b[0m", "[setTargetPosition] Waiting: " + ((Math.abs(cp-tp) / 100 * that.fullmotiontime)+that.fullmotiontimepadding));
                        setTimeout(function () {
                            that.targetPosition = value;
                            that.blindService.setCharacteristic(Characteristic.CurrentPosition, value);
                        }, ((Math.abs(cp-tp) / 100 * that.fullmotiontime)+that.fullmotiontimepadding));
                    } catch (e) {
                        if (count >= that.queryattempts - 1) {
                            debugLog(that.log, "\x1b[32m%s\x1b[0m", "[setTargetPosition] Communication error.  Giving up.");
                        } else {
                            debugLog(that.log, "\x1b[32m%s\x1b[0m", "[setTargetPosition] Communication error.  Will try again.  Count=" + count);
                            that.setTargetPosition(value, function() {}, ignore, ignore2, count + 1);
                        };
                    };
                });
            };
        }, 3000);
        debugLog(this.log, "\x1b[32m%s\x1b[0m","[setTargetPosition] Finished.");
        callback();
    },

    getTargetPosition: function(callback) {
        debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getTargetPosition] (" + this.name +  ") Started.");

        var ret = this.defaultcurrentposition;

        if (this.targetPositionInitialized == true) {
            debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getTargetPosition] (" + this.name +  ") targetPosition Initialized");
            ret = this.targetPosition;
        } else if (this.currentPositionInitialized == false) {
            ret = this.defaultcurrentposition;
        } else {
            debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getTargetPosition] (" + this.name +  ") targetPosition not Initialized");
            ret = this.blindService.getCharacteristic(Characteristic.CurrentPosition).value;
        };

        debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getTargetPosition] (" + this.name +  ") ret: " + ret);
        debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getTargetPosition] (" + this.name +  ") state: " + this.blindService.getCharacteristic(Characteristic.PositionState).value);
        debugLog(this.log, "\x1b[32m%s\x1b[0m", "[getTargetPosition] (" + this.name +  ") Finished.");
        callback(null, ret);
    },

    getState: function(callback) {
        debugLog(this.log, "getState");

        var ret = Characteristic.PositionState.STOPPED;
        var cp = this.blindService.getCharacteristic(Characteristic.CurrentPosition).value;
        var tp = this.blindService.getCharacteristic(Characteristic.TargetPosition).value;

        if (tp > cp) {
            ret = Characteristic.PositionState.INCREASING;
        } else if (tp < cp) {
            ret = Characteristic.PositionState.DECREASING;
        };

        debugLog(this.log, "  (getState) ret: " + ret);

        callback(null, ret);
    },

    // Respond to identify request
    identify: function(callback) {
        debugLog(this.log, this.name, "Identify");
        callback();
    }

};

function debugLog(log, text) { if (debug == true) { log.apply(this,Array.prototype.slice.call(arguments,1) ); }; }
function posToPercent (value) { value = Math.round((value / 65535) * 100); return value; }
function percentToPos (value) { value = Math.round((value / 100) * 65535); return value; }
