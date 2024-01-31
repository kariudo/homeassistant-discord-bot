import mqtt from "mqtt";

/**
 * Handles MQTT errors by logging the error to the console.
 *
 * @param {Error | mqtt.ErrorWithReasonCode} error - the error to be handled
 * @return {void}
 */
export const handleMqttError = (
	error: Error | mqtt.ErrorWithReasonCode,
): void => {
	console.error(`MQTT ${error}`);
};
