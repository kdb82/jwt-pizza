# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component | Backend endpoints | Database SQL |
| --------------------------------------------------- | ------------------ | ----------------- | ------------ |
| View home page                                      |   home.tsx         |     None          |    None          |
| Register new user<br/>(t@jwt.com, pw: test)         |   register.tsx   |      `[POST] /api/auth`             |              |
| Login new user<br/>(t@jwt.com, pw: test)            |    login.tsx                |     `[PUT] /api/auth`               |              |
| Order pizza                                         |   menu.tsx & payment.tsx                 | `[GET] /api/order/menu`, `[GET] /api/franchise`, `[POST] /api/order` |              |
| Verify pizza                                        |   delivery.tsx     | `[POST] /api/order/verify` via `VITE_PIZZA_FACTORY_URL` |              |
| View profile page                                   |   dinerDashboard.tsx | `[GET] /api/user/me`, `[GET] /api/order` |              |
| View franchise<br/>(as diner)                       |   franchiseDashboard.tsx | `[GET] /api/franchise/{user.id}` |              |
| Logout                                              |     logout.tsx               | `[DELETE] /api/auth` |              |
| View About page                                     |      about.tsx              |                   |              |
| View History page                                   |   history.tsx                 |                   |              |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) |   login.tsx         | `[PUT] /api/auth` |              |
| View franchise<br/>(as franchisee)                  |   franchiseDashboard.tsx | `[GET] /api/franchise/{user.id}` |              |
| Create a store                                      |   franchiseDashboard.tsx & createStore.tsx | `[POST] /api/franchise/{franchise.id}/store` |              |
| Close a store                                       |   franchiseDashboard.tsx & closeStore.tsx | `[DELETE] /api/franchise/{franchise.id}/store/{store.id}` |              |
| Login as admin<br/>(a@jwt.com, pw: admin)           |   login.tsx         | `[PUT] /api/auth` |              |
| View Admin page                                     |   adminDashboard.tsx | `[GET] /api/franchise?page={page}&limit={limit}&name={nameFilter}` |              |
| Create a franchise for t@jwt.com                    |   adminDashboard.tsx & createFranchise.tsx | `[POST] /api/franchise` |              |
| Close the franchise for t@jwt.com                   |   adminDashboard.tsx & closeFranchise.tsx | `[DELETE] /api/franchise/{franchise.id}` |              |
