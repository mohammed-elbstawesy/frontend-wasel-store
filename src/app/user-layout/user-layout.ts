import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './home/navbar/navbar';
import { FooterComponent } from './home/footer/footer.component';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, FooterComponent],
  templateUrl: './user-layout.html',
  styleUrl: './user-layout.css'
})
export class UserLayout { }