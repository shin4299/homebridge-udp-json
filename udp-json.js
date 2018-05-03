'use strict';

const dgram = require('dgram');

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-udp-json', 'UDPJSON', UDPJSONPlugin);
};

class UDPJSONPlugin
{
  constructor(log, config) {
    this.log = log;
    this.temperatureOff = config.temperatureOff;
    this.humidityOff = config.humidityOff;
    this.carbonDioxideOff = config.carbonDioxideOff;
    this.lightOff = config.lightOff;
    this.name = config.name;
    this.name_temperature = config.name_temperature || this.name;
    this.name_humidity = config.name_humidity || this.name;
    this.name_carbonDioxide = config.name_carbonDioxide || this.name;
    this.name_light = config.name_light || this.name;
    this.listen_port = config.listen_port || 8268;
	  
    this.informationService = new Service.AccessoryInformation();

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Bosch")
      .setCharacteristic(Characteristic.Model, "RPI-UDPJSON")
      .setCharacteristic(Characteristic.SerialNumber, this.device);

   this.temperatureService = new Service.TemperatureSensor(this.name_temperature);	    
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100,
        maxValue: 100
      });

	  
		this.humidityService = new Service.HumiditySensor(this.name_humidity);	    
	  
	 this.carbondioxideService = new Service.CarbonDioxideSensor(this.name_carbonDioxide);
	  
	this.lightService = new Service.LightSensor(this.name_light);


    this.server = dgram.createSocket('udp4');
    
    this.server.on('error', (err) => {
      console.log(`udp server error:\n${err.stack}`);
      this.server.close();
    });

    this.server.on('message', (msg, rinfo) => {
      console.log(`server received udp: ${msg} from ${rinfo.address}`);

      let json;
      try {
          json = JSON.parse(msg);
      } catch (e) {
          console.log(`failed to decode JSON: ${e}`);
          return;
      }

      const temperature_c = json.temperature_c;
      //const pressure_hPa = json.pressure_hPa; // TODO
      //const altitude_m = json.altitude_m;
      const humidity_percent = json.humidity_percent;
      const co2_ppm = json.co2_ppm;
      const light_lux = json.light_lux;

    if (temperature_c > -100) { 
   	this.temperatureService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .setValue(Math.round(temperature_c));
    }	    
    if (humidity_percent > 0) {
      	this.humidityService
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .setValue(Math.round(humidity_percent));
    }
    if (co2_ppm > 100) {
	this.carbondioxideService
	.getCharacteristic(Characteristic.CarbonDioxideDetected)
	.setValue(co2_ppm > 1200 ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL)
	this.carbondioxideService
	.getCharacteristic(Characteristic.CarbonDioxideLevel)
	.setValue(Math.round(co2_ppm))	  
    }
    if (light_lux >= 0) {
        this.lightService
	.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
	.setValue(Math.round(light_lux))
    }
    });

    
    this.server.bind(this.listen_port);

  }

  getServices() {
    return [this.informationService, this.humidityService, this.temperatureService, this.carbondioxideService, this.lightService]
  }
}
//
