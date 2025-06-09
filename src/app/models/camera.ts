export interface Camera {
  idCamera?: number;
  nomCamera: string;
  location: string;
  ipAdress: string;
  macAdress: string;
  statusCamera: 'normal' | 'offline' | 'blurry';
  user: any; // or create User interface
  groupe: any; // or create Groupe interface
}