import Plugin from "osbx/lib/core/plugin";
import OpenType, { Font } from "opentype.js";
import { createCanvas } from "canvas"

class osbx_font extends Plugin {
    
    private font!: OpenType.Font;   
    private textureCache = Array<FontTexture>();
    private folder_path!: string;
    
    public loadFont(font_name: string): void;
    public loadFont(font_name: string, folder_name: string): void;
    public loadFont(font_name: string, folder_name?: string): void {
        try {
            let font = OpenType.loadSync(`plugins/osbx_font/fonts/${font_name}`);
            this.folder_path = folder_name ?? "sb/f";
            this.font = font;
        } catch(error) {
            if(error) this.logger.ErrorLog(error);
        }
    }

    public getTexture(value: string): FontTexture {
        for(let i = 0; i < this.textureCache.length; i++) {
            if(this.textureCache[i].text === value)
                return this.textureCache[i];
        }
        return this.generateTexture(value);
    }

    private generateTexture(value: string): FontTexture {
        if(!this.asFont()) {
            const ImageDataURI = require('image-data-uri');

            // If value is empty return an empty texture
            if(value === " ") {
                return {
                    text: "",
                    path: "",
                    isEmpty: true
                }
            }

            // Generating a font from a virtual HTML canvas
            value = value.trim();
            const width = this.font.getAdvanceWidth(value);
            const name = value.length == 1 ? this.dec2hexString(value.charCodeAt(0)) : this.getName(value);
            const canvas = createCanvas(width + 20, 80)
            const ctx = canvas.getContext("2d");
            const path = this.font.getPath(value, 10, 65, 72);
            const path_to_image = `${this.project_configs.path_info.beatmap_path}/${this.folder_path}/${name}.png`;
            
            path.fill = "white";
            path.draw(ctx);
            ImageDataURI.outputFile(canvas.toDataURL("image/png"), path_to_image);

            const texture = {
                text: value,
                path: path_to_image,
                isEmpty: false
            }

            this.textureCache.push(texture);
            return texture;
        }
        throw "";
    }

    public generateSentence(text: string, fontOptions: FontOption) {
        
    }

    private getName(text: string): string {
        let texturesCount = 0;
        for(let i = 0; i < this.textureCache.length; i++) {
            if(this.textureCache[i].text.length > 1) {
                texturesCount++;
            }
        }    
        return `_${this.dec2hexString(texturesCount, 3)}`;
    }

    private dec2hexString(dec: number, x: number = 4) {
        return '' + (dec+0x10000).toString(16).substr(-x).toUpperCase();
    }

    private asFont(): boolean {
        try {
            if(this.font) return false;
            throw "Tried to execute a function while font value is empty!";
        } catch(e) {
            this.logger.ErrorLog(e);
            return true;
        }
    }
}

type FontTexture = {
    isEmpty: boolean,
    text: string,
    path: string
}

type FontOption = {
    name: string,
    folder_location?: "sb/f",
    per_character?: false
}

export default new osbx_font;
export { osbx_font }