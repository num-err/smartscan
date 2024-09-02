import mongoose from 'mongoose';
import QRCode from 'qrcode';
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    id: {
        type: Number,
        required: [true, 'ID is required'],
        unique: true,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value'
        }
    },
    numberOfMaleMembers: {
        type: Number,
        required: [true, 'Number of male members is required'],
        min: [0, 'Number of male members cannot be negative']
    },
    numberOfFemaleMembers: {
        type: Number,
        required: [true, 'Number of female members is required'],
        min: [0, 'Number of female members cannot be negative']
    },
    specialCase: {
        type: String,
        required: [true, 'Special case is required'],
        default: 'None'
    },
    imageUrl: {
        type: Buffer, // Store image as binary data
        required: [true, 'Image data is required']
    },
    qrcodeData: {
        type: String
    },
    lastScanTime: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const qrcodeData = await QRCode.toDataURL(this.id.toString());
            this.qrcodeData = qrcodeData;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

const User = mongoose.model('User', userSchema);
export default User;