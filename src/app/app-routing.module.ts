import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FileUploadComponent } from './file-upload/file-upload.component';

const routes: Routes = [
  { path: 'upload', component: FileUploadComponent },
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { path: '**', redirectTo: '/upload' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
