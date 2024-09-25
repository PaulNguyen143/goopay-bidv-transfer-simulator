import CloseIcon from "@mui/icons-material/Close";
import { Alert, Divider, Grid, Snackbar } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { QrScanner } from "@yudiel/react-qr-scanner";
import axios from "axios";
import { sha256 } from "js-sha256";
import { Fragment, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { decodeQr } from "vn-qr-pay";

interface IVietQr {
  isValid: boolean;
  version: string;
  initMethod: string;
  provider: {
    fieldId: string;
    guid: string;
    name: string;
    service: string;
  };
  consumer: {
    bankBin: string;
    bankNumber: string;
  };
  category: string;
  currency: string;
  amount: string;
  tipAndFeeType: string;
  tipAndFeeAmount: string;
  tipAndFeePercent: string;
  nation: string;
  acquier: {
    name: string;
    id: string;
  };
  city: string;
  zipCode: string;
  additionalData: {
    billNumber: string;
    mobileNumber: string;
    store: string;
    loyaltyNumber: string;
    reference: string;
    customerLabel: string;
    terminal: string;
    dataRequest: string;
    purpose?: string;
  };
  crc: string;
}

const min = 0;
const max = 499000000;

const listSupportBanks = [
  {
    swiftCode: "BIDVVNVX",
    bin: "970418",
    shortName: "BIDV",
    bankCode: "bidv"
  },
];

const BIDV_SECRET_CODE = "cOcrolOftErpArdickTorANTErAiRoBe";

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {"Copyright © "}
      <Link color="inherit" href="https://goopay.vn/">
        Goopay
      </Link>{" "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}
const defaultTheme = createTheme();
export default function App() {
  const windowUrl = window.location.search;
  const params = new URLSearchParams(windowUrl);
  const [qrData, setQrData] = useState<IVietQr | null>();
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>();
  const [isValidQr, setIsValidQr] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(100000);
  const [virtualAccountData, setvirtualAccountData] = useState<any>({});
  const [open, setOpen] = useState(false);

  const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  };

  const createChecksum = (str: string) => {
    return sha256(str + BIDV_SECRET_CODE);
  }

  const handleSubmit = (event: any) => {
    event.preventDefault();
    // let data = JSON.stringify({
    //   bankCode: listSupportBanks.find((item) => item.bin === qrData?.consumer?.bankBin)?.bankCode,
    //   customerAccount: qrData?.consumer?.bankNumber,
    //   amount: amount,
    //   remark: qrData?.additionalData?.purpose
    // });
    const data: any = {
      transId: Date.now().toString(),
      customerAcc: qrData?.consumer?.bankNumber,
      amount: amount,
      billNumber: virtualAccountData?.billNumber || Date.now().toString(),
      remark: qrData?.additionalData?.purpose,
      fromBank: "Simulator",
      fromAcc: "sml1403",
      fromAccName: "Simulator Account"
    }
    data.checksum = createChecksum(`${data.transId}${data.amount}${data.customerAcc}${data.billNumber}`)
    const enviroment = params.get("env") || "stg";
    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://s-3rdparty-${enviroment}.goopay.vn/api/v1/va/bidv/payBill`,
      
      headers: {
        "Content-Type": "application/json"
      },
      data: data
    };
    axios
      .request(config)
      .then((response) => {
        if(response.data.code === "000") {
          toast.success("Chuyển tiền thành công");
          setQrData(null);
          setIsValidQr(false);
        } else {
          toast.error(`Chuyển tiền thất bại. Lý do: ${response.data?.message}`);
        }
      })
      .catch((error) => {
        toast.error(`Chuyển tiền thất bại. Lý do: ${error?.response?.data?.message || error.message}`);
      });
  };

  const handleGetVirtualAccountData = async (accountNumber: string) => {
    const enviroment = params.get("env") || "stg";
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: `https://s-3rdparty-${enviroment}.goopay.vn/api/v1/va/bidv/getBill`,
      headers: {
        "Content-Type": "application/json"
      },
      data: {
        customerAcc: accountNumber,
        checksum: createChecksum(accountNumber),
      }
    };
    axios
      .request(config)
      .then((response) => {
        if(response.data.code === "000") {
          setAmount(response.data?.amount || 100000);
          setvirtualAccountData(response.data);
          setIsValidQr(true);
        } else {
          toast.error(`Lấy thông tin tài khoản thất bại. Lý do: ${response.data?.message}`);
          setvirtualAccountData({});
          setIsValidQr(false);
        }
      })
      .catch((error) => {
        toast.error(`Lấy thông tin tài khoản thất bại. Lý do: ${error?.response?.data?.message || error.message}`);
      });
  };

  const handleQrChange = (data: string) => {
    const decodeData: IVietQr = decodeQr(data);
    if (decodeData.isValid) {
      setQrErrorMessage(null);
      setQrData(decodeData);
      handleGetVirtualAccountData(decodeData.consumer.bankNumber)
    } else {
      setQrErrorMessage("QR Code không hợp lệ");
      setIsValidQr(false);
    }
  };

  const handleQrError = (error: any) => {
    setQrErrorMessage(error.toString());
    setIsValidQr(false);
    setQrData(null);
  };

  const action = (
    <Fragment>
      <Button color="success" size="small" onClick={handleClose}>
        UNDO
      </Button>
      <IconButton size="small" aria-label="close" color="inherit" onClick={handleClose}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Fragment>
  );

  return (
    <ThemeProvider theme={defaultTheme}>
      <ToastContainer />
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <Typography component="h1" variant="h5" sx={{ fontweight: "bolder" }}>
            Goopay BIDV Transfer Simulator
          </Typography>
        </Box>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <Box sx={{ m: 2 }}>
            <QrScanner onDecode={(data) => handleQrChange(data)} onError={(error) => handleQrError(error)} scanDelay={5000}/>
          </Box>
          {qrData && (
            <>
              <Divider></Divider>
              <Grid container spacing={2} alignItems={"center"} sx={{ m: 2 }}>
                <Grid xs={5}>
                  <Typography>Ngân hàng: </Typography>
                </Grid>
                <Grid xs={7}>
                  <Typography variant="button" sx={{ fontweight: "bold" }}>
                    {listSupportBanks.find((item) => item.bin === qrData.consumer.bankBin)?.shortName || "Không hỗ trợ"}
                  </Typography>
                </Grid>
                <Grid xs={5}>
                  <Typography>Số tài khoản: </Typography>
                </Grid>
                <Grid xs={7}>
                  <Typography variant="button" sx={{ fontweight: "bold" }}>
                    {qrData.consumer.bankNumber}
                  </Typography>
                </Grid>
                <Grid xs={5}>
                  <Typography>Tên tài khoản: </Typography>
                </Grid>
                <Grid xs={7}>
                  <Typography variant="button" sx={{ fontweight: "bold" }}>
                    {virtualAccountData?.customerName}
                  </Typography>
                </Grid>
                <Grid xs={5}>
                  <Typography>Nội dung chuyển: </Typography>
                </Grid>
                <Grid xs={7}>
                  <Typography variant="button" sx={{ fontweight: "bold" }}>
                    {qrData.additionalData.purpose}
                  </Typography>
                </Grid>
              </Grid>
              <Divider></Divider>
            </>
          )}
          {qrErrorMessage && <Alert severity="error">{qrErrorMessage}</Alert>}
          {isValidQr && (
            <TextField
              label="Số tiền"
              fullWidth
              type="number"
              inputProps={{ min, max }}
              defaultValue={100000}
              value={amount}
              onChange={(e) => {
                let value = parseInt(e.target.value, 10) || 0;
                if (value > max) value = max;
                if (value < min) value = min;
                setAmount(value);
              }}
              error={amount > max || amount < min}
              helperText={amount > max || amount < min ? "Số tiền không hợp lệ" : ""}
              variant="outlined"
              sx={{ mt: 2 }}
            />
          )}
          <Button disabled={!isValidQr} onClick={handleSubmit} fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} color="warning">
            Xác nhận
          </Button>
          <Snackbar open={open} autoHideDuration={6000} onClose={handleClose} message="Note archived" action={action} />
        </Box>
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </Container>
    </ThemeProvider>
  );
}
