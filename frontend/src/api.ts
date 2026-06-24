import axios from 'axios'

// Ensure we point to the actual FastAPI backend running on port 8000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function predictImage(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Bypass-Tunnel-Reminder': 'true'
      }
    });

    const data = response.data;
    return {
      status: data.status,
      coverage: data.coverage,
      overlay: data.overlay,
      mask: data.mask,
      heatmap: data.heatmap,
      original_width: data.original_width,
      original_height: data.original_height
    };
  } catch (error) {
    console.error("Error during PyTorch inference:", error);
    return {
      status: "ERROR",
      coverage: "0%",
      overlay: "",
      mask: "",
      heatmap: "",
      original_width: 0,
      original_height: 0
    };
  }
}

export async function fetchReport(payload: any) {
  try {
    const response = await axios.post(`${API_URL}/report`, payload, {
      headers: {
        'Bypass-Tunnel-Reminder': 'true'
      }
    });
    const data = response.data;
    
    // Decode base64 to Blob
    const byteCharacters = atob(data.pdf_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], {type: 'application/pdf'});
  } catch (error) {
    console.error("Error generating report:", error);
    const pdfContent = btoa("HYDROTECH AI REPORT\n\nStatus: ERROR\nCoverage: 0%\n\nFailed to generate report.");
    const byteCharacters = atob(pdfContent);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], {type: 'application/pdf'});
  }
}
