import React, { useCallback, useState } from 'react'
import Dropzone from 'react-dropzone'
import axios from 'axios'

export default function UploadPanel(){
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const onDrop = useCallback(async (files: File[]) => {
    if (!files || !files.length) return
    const f = files[0]
    setPreview(URL.createObjectURL(f))
  }, [])

  const analyze = async () => {
    if (!preview) return
    try{
      setLoading(true)
      // fetch blob from preview and send to backend
      const blob = await fetch(preview).then(r=>r.blob())
      const fd = new FormData()
      fd.append('file', new File([blob], 'upload.png', { type: 'image/png' }))
      const res = await axios.post('http://127.0.0.1:8000/predict', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
    }catch(e){
      console.error(e)
      alert('Analysis failed')
    }finally{setLoading(false)}
  }

  return (
    <div className="glass-panel p-6">
      <h3 className="text-lg font-semibold">Upload Satellite Image</h3>
      <Dropzone onDrop={onDrop} accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }} maxFiles={1}>
        {({getRootProps, getInputProps}) => (
          <div {...getRootProps()} className="mt-4 rounded-xl border-2 border-dashed border-cyan-400/30 p-8 text-center cursor-pointer">
            <input {...getInputProps()} />
            <p className="text-slate-300">Drag & drop or click to select an image</p>
          </div>
        )}
      </Dropzone>

      {preview && (
        <div className="mt-4">
          <img src={preview} alt="preview" className="w-full rounded-md object-cover" />
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <button onClick={analyze} disabled={loading || !preview} className="rounded-full bg-cyan-400 px-6 py-3 text-slate-900 font-semibold">
          {loading ? 'Analyzing...' : 'Analyze Flood Risk'}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h4 className="font-semibold">Results</h4>
          <pre className="text-sm text-slate-200">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
