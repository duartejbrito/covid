import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RestCountry } from '../models/restcountries/rest-country';

@Injectable({
  providedIn: 'root'
})
export class RestCountriesService {
  private baseUrl = `https://restcountries.eu/rest/v2`;

  constructor(private http: HttpClient) { }

  all(): Observable<RestCountry[]> {
    return this.http.get<RestCountry[]>(`${this.baseUrl}/all`);
  }

  code(code: string): Observable<RestCountry> {
    return this.http.get<RestCountry>(`${this.baseUrl}/code/${code}`);
  }

  name(name: string): Observable<RestCountry> {
    return this.http.get<RestCountry>(`${this.baseUrl}/all/${name}`);
  }
}
