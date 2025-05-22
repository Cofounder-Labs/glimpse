export enum PageState {
  Home = 0,
  Loading = 1,
  Editor = 2,
  Published = 3,
  VideoEditor = 4,
}

export type Team = {
  id: string;
  name: string;
  logo: string;
  imageCount: number;
};

export type Slide = {
  id: number;
  title: string;
  content: string;
};

export type Demo = {
  title: string;
  description: string;
  image: string;
}; 