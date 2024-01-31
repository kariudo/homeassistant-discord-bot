export interface BotConfig {
	bot: {
		token: string;
		nickname: string;
		id: string;
	};
	mqtt: {
		url: string;
		port: string;
		username: string;
		password: string;
		clientId: string;
		topics: {
			connected: string;
			discovery: string;
			online: string;
			command: string;
			voice: string;
		};
	};
	guild: {
		id: string;
	};
	you: {
		id: string;
	};
}
