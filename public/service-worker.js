self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const focused = clients.find((client) => "focus" in client)
      if (focused) {
        return focused.focus()
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow("/workouts?start=1")
      }

      return undefined
    })
  )
})
