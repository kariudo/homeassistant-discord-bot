import { Device } from "./Device";

export interface DiscoveryComponent {
  topic: string;
  payload: DiscoveryComponentConfig;
}

export interface DiscoveryComponentConfig {
  value_template?: string;
  state_topic?: string;
  state_on?: string;
  state_off?: string;
  payload_on?: string;
  payload_off?: string;
  command_topic?: string;
  unique_id: string;
  name: string;
  json_attributes_topic?: string;
  json_attributes_template?: string;
  device: Device;
  icon?: string;
  options?: string[];
  command_template?: string;
  availability_topic?: string;
  availability_template?: string;
  payload_available?: string;
  payload_not_available?: string;
  device_class?: string;
}
