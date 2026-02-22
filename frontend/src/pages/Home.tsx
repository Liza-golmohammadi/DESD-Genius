import { NavLink } from "react-router"

const Home = () => {
  return (
	<div>
    <p>Home</p>
    <NavLink to="/user">User</NavLink>
    <p></p>
    <NavLink to="/logout">Logout</NavLink>
  </div>
  )
}

export default Home