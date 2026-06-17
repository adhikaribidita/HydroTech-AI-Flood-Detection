import axios from 'axios'
import { useStore } from './store/useStore'

export async function predictImage(file: File) {
  const apiUrl = useStore.getState().settings.apiUrl
  const fd = new FormData()
  fd.append('file', file)
  
  const res = await axios.post(`${apiUrl}/predict`, fd, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

export async function fetchReport(payload: any) {
  const apiUrl = useStore.getState().settings.apiUrl
  const res = await axios.post(`${apiUrl}/report`, payload, {
    responseType: 'blob',
  })
  return res.data
}
