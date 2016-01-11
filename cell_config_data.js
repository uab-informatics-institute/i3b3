/**
 * This file is a part of the I2B2 InfoButtonPlugin
 * Copyright (C) 2015  Tim Kennell Jr. and James Cimino, MD
 * i2b2InfoButtons integrates infobuttons into i2b2 through a plugin
 * 
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, see <http://www.gnu.org/licenses/>.
 **
 * Loads file dependencies for InfoButton plugin
 **/

{
    "files": ["InfoButton_ctrlr.js"],
    "css": ["InfoButton.css"],
    "config": {
        "short_name": "InfoButton Plugin",
        "name": "InfoButton Plugin -- basic build to get it working",
        "description": "Plugin built to retrieve information from OpenInfoButton in an HL7 compliant standard",
        "icons": { "size32x32": "infobutton32x32.png" },
        "category": ["celless", "plugin", "standard"],
        "plugin": {
            "isolateHtml": false,
            "isolateComm": false,
            "standardTabs": true,
            "html": {
                "source": "injected_screens.html",
                "mainDivId": "i2b2Infobuttons-div"
            }
        }
    }
}