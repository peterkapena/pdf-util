import { CssVarsProvider } from '@mui/joy'
import { RouterProvider } from 'react-router-dom'
import { router } from './helpers/router'

function App() {
  return (
    <CssVarsProvider>
      <RouterProvider router={router} />
     </CssVarsProvider>
  )
}

export default App
