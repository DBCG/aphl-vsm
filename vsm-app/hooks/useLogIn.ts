import { useState, useEffect } from 'react'

// placeholder for real log in async interactions
const useLogIn = ({ username, password}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    if(username.length && password.length) {
      setIsLoggedIn(true)
    }
  }, [])

  return [isLoggedIn, setIsLoggedIn]
}

export { useLogIn }