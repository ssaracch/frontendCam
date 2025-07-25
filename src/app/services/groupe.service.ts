import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Groupe } from '../models/groupe';

@Injectable({
  providedIn: 'root'
})
export class GroupeService {
  
  private apiUrl = 'http://localhost:9090/api/groupes'; // Adjust your backend URL here

  constructor(private http: HttpClient) { }

  getAllGroups(): Observable<Groupe[]> {
    return this.http.get<Groupe[]>(this.apiUrl);
  }

  // Optionally add more methods here (add, update, delete groups) if needed
}
