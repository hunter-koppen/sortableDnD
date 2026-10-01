/**
 * @typedef Property
 * @type {object}
 * @property {string} key
 * @property {string} caption
 * @property {string} description
 * @property {string[]} objectHeaders
 * @property {ObjectProperties[]} objects
 * @property {Properties[]} properties
 */

/**
 * @typedef ObjectProperties
 * @type {object}
 * @property {PropertyGroup[]} properties
 * @property {string[]} captions
 */

/**
 * @typedef PropertyGroup
 * @type {object}
 * @property {string} caption
 * @property {PropertyGroup[]} propertyGroups
 * @property {Property[]} properties
 */

/**
 * @typedef Properties
 * @type {PropertyGroup}
 */

/**
 * @typedef Problem
 * @type {object}
 * @property {string} property
 * @property {("error" | "warning" | "deprecation")} severity
 * @property {string} message
 * @property {string} studioMessage
 * @property {string} url
 * @property {string} studioUrl
 */

/**
 * @param {object} values
 * @param {Properties} defaultProperties
 * @param {("web"|"desktop")} target
 * @returns {Properties}
 */
const ITEM_ONLY = ["itemKey"];
const ZONE_ONLY = ["zoneKey", "orientation", "onDrop"];

/** Removes the given property keys wherever they sit in the (nested) property groups. */
function hideProperties(groups, keys) {
    groups.forEach(group => {
        if (group.properties) {
            group.properties = group.properties.filter(property => !keys.includes(property.key));
        }
        if (group.propertyGroups) {
            hideProperties(group.propertyGroups, keys);
        }
    });
}

/**
 * @param {object} values
 * @param {Properties} defaultProperties
 * @param {("web"|"desktop")} target
 * @returns {Properties}
 */
export function getProperties(values, defaultProperties, target) {
    hideProperties(defaultProperties, values.role === "zone" ? ITEM_ONLY : ZONE_ONLY);
    return defaultProperties;
}

/**
 * @param {Object} values
 * @returns {Problem[]} returns a list of problems.
 */
export function check(values) {
    /** @type {Problem[]} */
    const errors = [];
    if (!values.group || !values.group.trim()) {
        errors.push({
            property: "group",
            message: "Set a group name; items and zones only work together within a group."
        });
    }
    if (values.role === "item" && !values.itemKey) {
        errors.push({ property: "itemKey", message: "An item needs an item key, e.g. toString($currentObject/ID)." });
    }
    if (values.role === "zone" && !values.onDrop) {
        errors.push({
            property: "onDrop",
            severity: "warning",
            message: "Without an On drop action, dropping does nothing."
        });
    }
    return errors;
}

/**
 * @param {Object} values
 * @param {("web"|"desktop")} platform
 * @returns {string}
 */
export function getCustomCaption(values, platform) {
    return `Sortable DnD (${values.role === "zone" ? "zone" : "item"})`;
}

// /**
//  * @param {object} values
//  * @param {boolean} isDarkMode
//  * @param {number[]} version
//  * @returns {object}
//  */
// export function getPreview(values, isDarkMode, version) {
//     // Customize your pluggable widget appearance for Studio Pro.
//     return {
//         type: "Container",
//         children: []
//     };
// }

// /**
//  * @param {Object} values
//  * @param {("web"|"desktop")} platform
//  * @returns {string}
//  */
// export function getCustomCaption(values, platform) {
//     return "SortableDnD";
// }
