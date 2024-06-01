import { BrowserRouter } from 'react-router-dom'
import './App.css'
import { AppRoutes } from './App.routes'
import { graphqlClient } from './graphql/client'
import { Provider } from 'urql'


function App() {

  return (
    <Provider value={graphqlClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  )

}

export default App
