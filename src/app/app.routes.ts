import { Routes } from '@angular/router';
import { authGuard } from './guard/auth-guard';

export const routes: Routes = [{
    path:"",
    pathMatch:'full',
    loadComponent:
       ()=>{
        return import("./home/home").then(m=>m.Home)
       }
    },
    {
        path:"login",
        loadComponent:()=>{
            return import("./login-user/login-user").then(m=>m.LoginUser)
        }
    },
    {
        path:"register",
        loadComponent:()=>{
            return import("./register-user/register-user").then(m=>m.RegisterUser)
        }
    },
    {
        path:"product/:id",
        canActivate:[authGuard],
        loadComponent:()=>{
            return import("./product-detail/product-detail").then(m=>m.ProductDetail)
        }
    },
    {
        path:"cart",
        canActivate:[authGuard],
        loadComponent:()=>{
            return import ("./cart/cart").then(m=>m.Cart)
        }
    },
    {
        path: 'reset-password',
        canActivate:[authGuard],
        loadComponent:()=>{
            return import ("./reset-password-component/reset-password-component").then(m=>m.ResetPasswordComponent)
        } 

    },
    {
        path: "profile",
        canActivate: [authGuard],
        loadComponent: () => import("./profile/profile").then(m => m.Profile)
    }, 
    {
        path: "admin-dashboard",
        canActivate: [authGuard],
        loadComponent: () => import("./admin-dashboard/admin-dashboard").then(m=>m.AdminDashboard)
    },  
    {
        path: "admin-conversation",
        canActivate: [authGuard],
        loadComponent: () => import("./admin-conversations/admin-conversations").then(m=>m.AdminConversations)
    },   
    {
        path: "admin-products",
        canActivate: [authGuard],
        loadComponent: () => import("./admin-products/admin-products").then(m=>m.AdminProducts)
    },   
        {
        path: "products-category",
        canActivate: [authGuard],
        loadComponent: () => import("./product-category/product-category").then(m=>m.ProductCategory)
    },   
];
