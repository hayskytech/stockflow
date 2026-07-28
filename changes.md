## Frontend changes

Add 4 related products below product view. 

we should ask login before adding to cart. when clicked on add to cart show a modal for login.

in checkout page, address should come from his personal details, we took during registration.

## Admin side changes

In Users page, inside user edit: password field should have show hide eye icon.

Remove the concept of temporary password. if admin created the user, then password should be permenant. dont force user to change password.

See all fields in registration page and keep same fields in admin side user add or user edit.

when we delete a customer, it should be soft delete. so that orders made by that user will stay safe without disturbing the stock and any other things. If we add same customer again with same email id or phone number then it should just activate the user account.

create a UserView page: in that page list out orders made by that user. add some features related to user. keep the in tabs. like orders tab, details tab, payments tab etc.
