import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }

            if (
              id.includes('chart.js') ||
              id.includes('react-chartjs-2') ||
              id.includes('xlsx') ||
              id.includes('exceljs') ||
              id.includes('jspdf') ||
              id.includes('jspdf-autotable') ||
              id.includes('html2canvas') ||
              id.includes('react-pdf')
            ) {
              return 'vendor-reports'
            }

            if (
              id.includes('@mui') ||
              id.includes('@emotion') ||
              id.includes('react-bootstrap') ||
              id.includes('bootstrap') ||
              id.includes('react-select') ||
              id.includes('react-datepicker') ||
              id.includes('sweetalert2')
            ) {
              return 'vendor-ui'
            }

            return 'vendor-misc'
          }
        },
      },
    },
  },
})
