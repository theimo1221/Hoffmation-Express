### Create Rooms
Hoffmation is centered about rooms. 
Many follow certain default behaviour while others have very specific rules.
To be modular Rooms within HoffMation should be generated automatically.

To do so use the Excel Document `Raumdefinition.xlsm`
Within that document you have to add all your rooms and the devices.

Afterwards you can create the resulting config code and paste that into `/config/private/roomConfig.txt`.
Using `npm run create-rooms` the needed source files are generated for you.

Any room specific logic can be added to the `custom.ts` file of each room. 
If these files exists they won't get overridden rerunning `create-rooms`.

