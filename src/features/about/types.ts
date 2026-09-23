export type TAboutSection = {
	id: string;
	heading: string;
	body: string;
};

export type TAboutContent = {
	title: string;
	intro: string;
	sections: TAboutSection[];
};
