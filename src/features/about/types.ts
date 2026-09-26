export type TAboutSection = {
	id: string;
	heading: string;
	body: string;
};

export type TAboutCapability = {
	id: string;
	name: string;
	description: string;
	href: string;
	linkLabel: string;
};

export type TAboutContent = {
	title: string;
	intro: string;
	capabilitiesHeading: string;
	capabilities: TAboutCapability[];
	sections: TAboutSection[];
};
