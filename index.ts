import Plugin from "osbx/lib/core/plugin";
import OpenType, { Font } from "opentype.js";
import { createCanvas } from "canvas"
import { Easings, Layers, Options, Origins, random, toMS, V2 } from "osbx/lib/core/utils";
import { randomInt } from "crypto";

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

    public fromCSV(path: string, type: TextType = TextType.BASIC) {
        const lyrics_file = require(`${this.project_configs.path_info.project_path}/configs/lyrics.json`);
        for(const lyric of lyrics_file) {
            this.generateText(lyric.text, toMS(lyric.startTime), toMS(lyric.endTime), lyric.position ?? Options.SCREEN_CENTER,type);
        }
    }

    public generateText(text: string, startTime: number, endTime: number, position: V2 = {x:320,y:240}, type: TextType = TextType.BASIC, scale: number = 0.3) {
        if(this.asFont()) {
            switch(type) {
                default: break;

                case TextType.BASIC:
                    const texture = this.getTexture(text);
                    let sprite = this.CreateSprite(texture.path);
                    sprite.Fade(startTime, 0, startTime + 1000, 1);
                    sprite.Fade(endTime, 1, endTime + 1000, 0);
                    sprite.Scale(startTime, 0.3);
                break

                case TextType.PER_CHARACTER:
                    this.generate_per_character(text, startTime, endTime, position, scale);
                break;

                case TextType.LEFT_01:
                    this.generate_left_01(text, startTime, endTime, position, scale);
                break;
            }
        }
    }

    private generate_left_01(text: string, startTime: number, endTime: number, position: V2, scale: number) {
        let delay = 0;
        for(const letter of text) {
            const texture = this.getTexture(letter);
            const randomStart = randomInt(0, 2000)
            if(!texture.isEmpty) {
                const letter_position = this.getOffset(position, texture, Origins.Centre, scale);
                let sprite = this.CreateSprite(texture.path, Layers.Foreground, Origins.Centre, letter_position);
                sprite.Fade(startTime + randomStart, 0, startTime + randomStart + 1000, 1);
                sprite.Fade(endTime, 1, endTime + 1000, 0);
                sprite.Scale(startTime, scale);
                sprite.MoveY(startTime + randomStart, letter_position.y + random(5, 15), startTime + randomStart + 1000, letter_position.y, Easings.SineOut);
                delay += 100;
            }
            position.x += texture.width * scale;
        }
    }

    private generate_per_character(text: string, startTime: number, endTime: number, position: V2, scale: number) {
        position.x = position.x - (this.font.getAdvanceWidth(text) / 2) * scale;
        let delay = 0;
        for(const letter of text) {
            const texture = this.getTexture(letter);
            if(!texture.isEmpty) {
                const letter_position = this.getOffset(position, texture, Origins.Centre, scale);
                let sprite = this.CreateSprite(texture.path, Layers.Foreground, Origins.Centre, letter_position);
                sprite.Fade(startTime + delay, 0, startTime + delay + 300, 1);
                sprite.Fade(endTime, 1, endTime + 1000, 0);
                sprite.Scale(startTime, scale);
                sprite.MoveX(startTime + delay, letter_position.x + 100, startTime + delay + 300, letter_position.x, Easings.ExpoOut);
                delay += 100;
            }
            position.x += texture.width * scale;
        }
    }

    private getOffset(position: V2, texture: FontTexture, origin: string, scale: number): V2 {
        switch(origin) {
            case "Centre":
                return {
                    x: position.x + (texture.width * 0.5) * scale,
                    y: position.y
                }
            break;
        }


        return position;
    }

    private generateTexture(value: string): FontTexture {
        if(this.asFont()) {
            const ImageDataURI = require('image-data-uri');

            // If value is empty return an empty texture
            if(value === " ") {
                return {
                    text: "",
                    path: "",
                    width: 30,
                    height: 80,
                    isEmpty: true,
                    abs_path: ""
                }
            }

            // Generating a font from a virtual HTML canvas
            value = value.trim();
            const width = this.font.getAdvanceWidth(value);
            const name = value.length == 1 ? this.dec2hexString(value.charCodeAt(0)) : this.getName(value);
            const canvas = createCanvas(width + 20, 80)
            const ctx = canvas.getContext("2d");
            const path = this.font.getPath(value, 10, 65, 72);
            const path_to_image = `${this.folder_path}/${name}.png`;
            
            path.fill = "white";
            path.draw(ctx);
            ImageDataURI.outputFile(canvas.toDataURL("image/png"), `${this.project_configs.path_info.beatmap_path}/${path_to_image}`);


            const texture = {
                text: value,
                path: path_to_image,
                isEmpty: false,
                width: width,
                height: 80,
                abs_path: `${this.project_configs.path_info.beatmap_path}/${path_to_image}`
            }

            this.textureCache.push(texture);
            return texture;
        }
        throw "";
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
            if(this.font) return true;
            throw "Tried to execute a function while font value is empty!";
        } catch(e) {
            this.logger.ErrorLog(e);
            return false;
        }
    }
}

type FontTexture = {
    isEmpty: boolean,
    text: string,
    path: string,
    abs_path: string,
    width: number,
    height: number
}

export enum TextType {
    BASIC,
    PER_CHARACTER,
    LEFT_01
}

export default new osbx_font;
export { osbx_font }