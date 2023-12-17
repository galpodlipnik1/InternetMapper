import { BrowserRouter, Route, Routes as Switch } from "react-router-dom"
import Home from "./pages/Home"

const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/" element={<Home />} />
      </Switch>
    </BrowserRouter>
  )
}

export default App