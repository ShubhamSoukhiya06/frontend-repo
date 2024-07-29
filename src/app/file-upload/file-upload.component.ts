import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { ChartData, ChartOptions, ChartType } from 'chart.js';
import { ApiService } from '../api.service';

interface CheckImageQualityResponse {
  result: string;
}
@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss'
})

export class FileUploadComponent {
  selectedFiles: File[] = [];
  folderFiles: File[] = [];
  isDragOver = false;
  acceptFiles = 'image/*'; // Accept only image files
  uploadBtnDisabled:boolean = true;
  uploadProgress: { fileName: string, correctValue: string, predictedValue: string, status: string }[] = [];
  public confusionMatrix: number[][] = [[0, 0], [0, 0]];
  public barChartData: ChartData<'bar'> | undefined;
  public barChartOptions: ChartOptions = {
    responsive: true,
    scales: {
      x: { stacked: true, title: { display: true, text: 'Predicted Class' } },
      y: { stacked: true, title: { display: true, text: 'Number of Samples' }, beginAtZero: true }
    },
    plugins: {
      legend: {
        display: true,
      }
    }
  };
  public barChartType: ChartType = 'bar';
  constructor(private http: HttpClient,
    private apiService: ApiService) {
}

ngOnInit() {
  this.barChartData = {
    labels: ['True Negative', 'False Positive', 'False Negative', 'True Positive'],
    datasets: [
      {
        label: 'Counts',
        data: [this.confusionMatrix[0][0], this.confusionMatrix[0][1], this.confusionMatrix[1][0], this.confusionMatrix[1][1]],
        backgroundColor: ['rgba(75, 192, 192, 0.2)'],
        borderColor: ['rgba(75, 192, 192, 1)'],
        borderWidth: 1
      }
    ]
  };
}

  onFileChange(event: any) {
    const files = event.target.files;
    console.log(event.target.id)
    if (event.target.id === 'fileInput') {
      // Handle individual file uploads
      this.validateAndAddFiles(files);
    } else if (event.target.id === 'folderInput') {
      // Handle folder uploads
      this.addFolderFiles(files);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.addFolderFiles(files);
    }
  }
  
  updateButtonState(): void {
    if (this.selectedFiles.length === 3 || this.folderFiles.length >= 3) {
      this.uploadBtnDisabled = false
    }
    else {
      this.uploadBtnDisabled = true
    }
  }
  private validateAndAddFiles(files: FileList) {
    if (this.selectedFiles.length + files.length > 3) {
      alert('You can only upload a maximum of 3 individual files.');
      return;
    }

    for (let i = 0; i < files.length; i++) {
      if (!this.selectedFiles.some(existingFile => existingFile.name === files[i].name && existingFile.size === files[i].size)) {
        this.selectedFiles.push(files[i]);
      }
      this.updateButtonState()
    }
  }

  private addFolderFiles(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name; 
      if (!this.folderFiles.some(existingFile => existingFile.name === fileName && existingFile.size === file.size)) {
        this.folderFiles.push(file);
      }
    }
    this.updateButtonState();
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
    this.updateButtonState()

  }

  removeFileFromFolder(index: number) {
    this.folderFiles.splice(index, 1);
    this.updateButtonState()
  }

  private sortFiles(files: File[]): File[] {
    return files.sort((fileA, fileB) => {
      const getFileOrder = (file: File): number => {
        const fileName = file.name.toLowerCase();
        if (fileName.startsWith("blanc")) return 1;
        if (fileName.startsWith("written")) return 2;
        return 3;
      };
  
      return getFileOrder(fileA) - getFileOrder(fileB);
    });
  }
  


  async onSubmit() {
    // Upload individual files in batches if any
    if (this.selectedFiles.length > 0) {
      const batchSize = 3;
      const numBatches = Math.ceil(this.selectedFiles.length / batchSize);

      for (let i = 0; i < numBatches; i++) {
        const batchFiles = this.selectedFiles.slice(i * batchSize, (i + 1) * batchSize);
        await this.uploadBatch(batchFiles, i);
      }
    }

    // Upload folder files if any
    if (this.folderFiles.length > 0) {
      await this.uploadFolder(this.folderFiles);
    }
  }

  private async uploadBatch(files: File[], batchIndex: number): Promise<void> {
    const formData = new FormData();
    
    // Sort files based on the naming pattern
    const sortedFiles = this.sortFiles(files);
    const fileNumber = sortedFiles[2]?.name.split('.')[0] ?? 'Unknown'; // Extract the file number
    //const correctName = sortedFiles[1]?.name.split('.')[0] ?? 'Unknown'; // Extract the correct name
    const correctName = sortedFiles.some(file => file.name.includes('C0')) ? 'CORRECT' : 'FAULTY';

    // Append sorted files to FormData with correct index
    sortedFiles.forEach((file, index) => {
      formData.append(`file${index + 1}`, file);
    });
    
    console.log(`Uploading batch: ${fileNumber}`);
    
    if (sortedFiles.length === 3) {
      try {
        this.apiService.uploadBatch(formData).subscribe({
          next: (response) => {
            if (response.status === 200) {
              console.log('Batch Upload successful!', response.body);
              const result = response.body?.result?.toUpperCase() ?? 'UNKNOWN'; 

              this.uploadProgress.push({ 
                fileName: fileNumber, 
                correctValue: correctName, 
                predictedValue: result, 
                status: 'Uploaded'
              });
            } else {
              console.error('Batch Upload failed with status:', response.status);
              this.uploadProgress.push({ 
                fileName: `Batch ${batchIndex + 1}`, 
                correctValue: correctName, 
                predictedValue: 'Unknown', 
                status: 'Failed' 
              });
            }
          },
          error: (err: any) => {
            console.error('Batch Upload failed!', err);
            this.uploadProgress.push({ 
              fileName: `Batch ${batchIndex + 1}`, 
              correctValue: correctName, 
              predictedValue: 'Unknown', 
              status: 'Failed' 
            });
          }
        });
      } catch (err) {
        console.error('Unexpected error occurred during batch upload', err);
        this.uploadProgress.push({ 
          fileName: `Batch ${batchIndex + 1}`, 
          correctValue: correctName, 
          predictedValue: 'Unknown', 
          status: 'Failed' 
        });
      }
    }
  }
  
  private extractNumberFromFilename(filename: string): number | null {
    // Regular expression to match all numeric sequences in the filename
    const match = filename.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  private groupFilesByNumber(files: File[]): Map<number, File[]> {
    const groupedFiles = new Map<number, File[]>();

    files.forEach(file => {
      const number = this.extractNumberFromFilename(file.name);
      if (number !== null) {
        if (!groupedFiles.has(number)) {
          groupedFiles.set(number, []);
        }
        groupedFiles.get(number)?.push(file);
      }
    });

    return groupedFiles;
  }

  private prepareBatches(groupedFiles: Map<number, File[]>): File[][] {
    const batches: File[][] = [];

    groupedFiles.forEach(files => {
      while (files.length >= 3) {
        batches.push(files.splice(0, 3));
      }
    });

    return batches;
  }
  
  private async checkBatch(formData: FormData, fileNumber: string, correctName: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.apiService.uploadBatch(formData).subscribe({
        next: (response) => {
          if (response.status === 200) {
            const result = response.body?.result?.toUpperCase() ?? 'UNKNOWN'; // Extract and capitalize the predicted result
            this.uploadProgress.push({ 
              fileName: fileNumber, 
              correctValue: correctName, // Assuming correctName is the correct value
              predictedValue: result ?? 'Unknown', // Assuming the result is the predicted value
              status: 'Uploaded'
            });
            resolve(response.body);
          } else {
            this.uploadProgress.push({ fileName: fileNumber, correctValue: correctName, predictedValue: 'Unknown', status: 'Failed' });
            resolve(null);
          }
        },
        error: (err: any) => {
          this.uploadProgress.push({ fileName: fileNumber, correctValue: correctName, predictedValue: 'Unknown', status: 'Failed' });
          reject(err);
        }
      });
    });
  }
  
  private async uploadFolder(files: File[]): Promise<void> {
  
    const batches = this.prepareBatches(this.groupFilesByNumber(files));
  
    for (let i = 0; i < batches.length; i++) {
      const formData = new FormData();
      const sortedFiles = this.sortFiles(batches[i]);
  
      // Extract number from filename
      const fileNumber = sortedFiles[2]?.name.split('.')[0] ?? 'Unknown';
      const correctName = sortedFiles.some(file => file.name.includes('C0')) ? 'CORRECT' : 'FAULTY';

      console.log('Preparing batch:', batches[i], 'File number:', fileNumber, 'Correct name:', correctName);
  
      // Append sorted files to FormData with correct index and only the file name
      sortedFiles.forEach((file, index) => {
        formData.append(`file${index + 1}`, file, file.name); // Use file.name to ensure only the filename is sent
      });
  
      try {
        await this.checkBatch(formData, fileNumber, correctName);
        console.log(`Batch with file number ${fileNumber} processed successfully.`);
      } catch (error) {
        console.error(`Batch with file number ${fileNumber} failed to process.`, error);
      }
    }
    this.generateConfusionMatrix();
    this.updateChartData();
  }

  private generateConfusionMatrix(): void {
    this.confusionMatrix = [[0, 0], [0, 0]];  // Reset the matrix

    this.uploadProgress.forEach(item => {
      if (item.correctValue === 'CORRECT' && item.predictedValue === 'CORRECT') this.confusionMatrix[0][0]++; // TP
      if (item.correctValue === 'CORRECT' && item.predictedValue === 'FAULTY') this.confusionMatrix[0][1]++; // FN
      if (item.correctValue === 'FAULTY' && item.predictedValue === 'CORRECT') this.confusionMatrix[1][0]++; // FP
      if (item.correctValue === 'FAULTY' && item.predictedValue === 'FAULTY') this.confusionMatrix[1][1]++; // TN
    });
  }

  private updateChartData(): void {
    this.barChartData = {
      labels: ['CORRECT', 'FAULTY'],  // These should correspond to predicted classes
      datasets: [
        {
          label: 'True Correct (TP)',
          data: [this.confusionMatrix[0][0], 0],  // TP in the first position
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'False Faulty (FN)',
          data: [this.confusionMatrix[0][1], 0],  // FN in the first position
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        },
        {
          label: 'False Correct (FP)',
          data: [0, this.confusionMatrix[1][0]],  // FP in the second position
          backgroundColor: 'rgba(255, 206, 86, 0.6)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 1
        },
        {
          label: 'True Faulty (TN)',
          data: [0, this.confusionMatrix[1][1]],  // TN in the second position
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1
        }
      ]
    };
  }

}




